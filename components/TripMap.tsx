'use client';

import dynamic from 'next/dynamic';
import { Button } from '@ui-sdk/react/button';
import { Component, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Trip } from '@/lib/trips';
import { tripDate, tripMedia, videoPosition } from '@/lib/trips';

const MapLibreTripMap = dynamic(() => import('./MapLibreTripMap'), { ssr: false });
class MapBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function TripMap({ trip, href }: { trip: Trip; href?: string }) {
  const root = useRef<HTMLElement>(null), viewer = useRef<HTMLDialogElement>(null), player = useRef<HTMLVideoElement>(null), videoClose = useRef<HTMLButtonElement>(null), videoOpener = useRef<HTMLElement | null>(null), returnStop = useRef<string | null>(null);
  const pendingDialogCloses = useRef(0);
  const videoPanel = useRef<HTMLElement>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [visible, setVisible] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const onMapReady = useCallback(() => setReady(true), []), onMapFailure = useCallback(() => setFailed(true), []);
  const media = tripMedia(trip);
  const active = index === null ? undefined : media[index];
  const selected = active?.kind === 'photo' ? { ...active, photo: active.media } : undefined;
  const clip = active?.kind === 'video' ? { ...active, video: active.media } : undefined;
  const stopPlayback = () => {
    player.current?.pause();
    player.current?.removeAttribute('src');
    player.current?.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
    player.current?.load();
    setPlaybackTime(0);
  };
  const closeDialog = () => {
    if (!viewer.current?.open) return;
    // Native close events are queued; a later photo may already be open when they arrive.
    pendingDialogCloses.current += 1;
    viewer.current.close();
  };
  const activate = (next: number) => {
    const item = media[next];
    if (!item || next === index) return;
    stopPlayback();
    if (!active) videoOpener.current = document.activeElement as HTMLElement;
    if (item.kind === 'video') closeDialog();
    if (item.kind === 'photo' && typeof viewer.current?.showModal !== 'function') {
      location.assign(item.media.original?.src ?? item.media.src);
      return;
    }
    returnStop.current = null;
    setIndex(next);
  };
  const closeVideo = () => {
    stopPlayback();
    returnStop.current = clip?.stopId ?? null;
    setIndex(null);
  };
  const navigate = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target instanceof HTMLVideoElement || index === null) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    activate(index + (event.key === 'ArrowRight' ? 1 : -1));
  };
  const navigation = <nav aria-label="Media navigation">
    <Button disabled={index === null || index === 0} onClick={() => index !== null && activate(index - 1)}>previous</Button>
    <span aria-live="polite">{index === null ? '' : `${index + 1} / ${media.length}`}</span>
    <Button disabled={index === null || index === media.length - 1} onClick={() => index !== null && activate(index + 1)}>next</Button>
  </nav>;
  const Heading = href ? 'h2' : 'h1';
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '150px' });
    observer.observe(root.current!); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const dialog = viewer.current;
    if (!selected || !dialog) return;
    if (!dialog.open) dialog.showModal();
    else if (!dialog.contains(document.activeElement) || (document.activeElement instanceof HTMLButtonElement && document.activeElement.disabled)) dialog.querySelector<HTMLButtonElement>('button')?.focus();
  }, [index]);
  useEffect(() => {
    if (clip) {
      const focused = document.activeElement;
      if (!videoPanel.current?.contains(focused) || (focused instanceof HTMLButtonElement && focused.disabled)) videoClose.current?.focus();
    } else if (returnStop.current) { const target = videoOpener.current?.isConnected ? videoOpener.current : root.current?.querySelector<HTMLButtonElement>(`button[data-stop-id="${returnStop.current}"]`); target?.focus(); returnStop.current = null; }
  }, [index]);
  return <section ref={root} className="trip-map" aria-label={`${trip.title} travel map`} data-renderer={failed ? 'fallback' : ready ? 'maplibre' : 'loading'}>
    <div className="trip-map-stage">
      <div className="map-static" hidden={ready && !failed}>
        <img className="map-poster" src="/maps/taiwan-overview.webp" alt="OpenStreetMap basemap of Taiwan and its surrounding coast." width="1200" height="800" />
        <details className="map-static-photos"><summary>Media and dates</summary>{media.map(item => <a key={item.id} href={item.media.original?.src ?? item.media.src}>{item.place} · <time dateTime={item.date}>{tripDate(item.date)}</time>{item.kind === 'video' && ' · video'}</a>)}</details>
        <small className="map-static-credit"><a href="https://protomaps.com">Protomaps</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://esa-worldcover.org/en/data-access">ESA WorldCover</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)</small>
      </div>
      {visible && !failed && <MapBoundary onFailure={onMapFailure}><MapLibreTripMap trip={trip} activeVideo={clip?.video} activeMediaId={active?.id} playbackTime={playbackTime} onReady={onMapReady} onFailure={onMapFailure} onPhoto={photo => {
        activate(media.findIndex(item => item.id === photo.id));
      }} onVideo={video => {
        activate(media.findIndex(item => item.id === video.id));
      }} /></MapBoundary>}
      {clip && <section ref={videoPanel} className="video-viewer" aria-labelledby={`video-viewer-${trip.id}`} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeVideo(); } else navigate(event); }}>
        <header><div><h2 id={`video-viewer-${trip.id}`}>{clip.place}</h2><time dateTime={clip.date}>{tripDate(clip.date)}</time></div><Button ref={videoClose} onClick={closeVideo}>close</Button></header>
        <video ref={player} key={clip.video.id} poster={clip.video.poster} controls playsInline preload="none" width={clip.video.width} height={clip.video.height} aria-label={clip.video.title} onTimeUpdate={event => setPlaybackTime(event.currentTarget.currentTime)} onSeeking={event => setPlaybackTime(event.currentTarget.currentTime)}>
          <source src={clip.video.src} type="video/mp4" />
          {clip.video.captions && <track kind="captions" src={clip.video.captions} srcLang="en" label="English" default />}
          <a href={clip.video.src}>Open video</a>
        </video>
        {navigation}
        <a className="video-original" href={clip.video.original?.src ?? clip.video.src} download>original</a>
        <p className="video-position-status" aria-live="off">{failed ? 'Map unavailable' : clip.video.track ? videoPosition(clip.video.track, playbackTime) ? 'GPS' : 'GPS gap' : 'No GPS'}</p>
        {trip.draft && !clip.video.captions && <p className="video-review-note">Unreviewed audio/captions</p>}
      </section>}
      <header className="map-caption"><Heading>{href ? <a className="trip-cover" href={href}>{trip.title}</a> : trip.title}</Heading><time dateTime={trip.month}>{tripDate(trip.month)}</time>{trip.draft && <small>draft</small>}</header>
    </div>
    <dialog ref={viewer} className="photo-viewer" aria-labelledby={`viewer-${trip.id}`} onClose={() => {
      if (pendingDialogCloses.current) { pendingDialogCloses.current -= 1; return; }
      if (!viewer.current?.open) {
        returnStop.current = active?.stopId ?? null;
        setIndex(null);
      }
    }} onClick={event => { if (event.target === event.currentTarget) viewer.current?.close(); }} onKeyDown={navigate}>
      <header><div><h2 id={`viewer-${trip.id}`}>{selected?.place ?? trip.title}</h2>{selected && <time dateTime={selected.date}>{tripDate(selected.date)}</time>}</div><Button onClick={() => viewer.current?.close()}>close</Button></header>
      {selected && <figure><img src={selected.photo.original?.src ?? selected.photo.src} alt={selected.photo.alt} width={selected.photo.original?.width ?? selected.photo.width} height={selected.photo.original?.height ?? selected.photo.height} /><figcaption>{selected.photo.caption}</figcaption></figure>}
      {navigation}
    </dialog>
  </section>;
}
