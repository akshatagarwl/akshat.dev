'use client';

import dynamic from 'next/dynamic';
import ReactPlayer from 'react-player';
import { Button } from '@ui-sdk/react/button';
import { Component, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Trip } from '@/lib/trips';
import { getMapRegion, type MapRegionId } from '@/lib/map-regions';
import { tripDate, tripMedia, videoPosition } from '@/lib/trips';

const MapLibreTripMap = dynamic(() => import('./MapLibreTripMap'), { ssr: false });
class MapBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function TripMap({ trip, href, region: regionId }: { trip: Trip; href?: string; region?: MapRegionId }) {
  const region = getMapRegion(trip.id, regionId);
  const root = useRef<HTMLElement>(null), viewer = useRef<HTMLDialogElement>(null), player = useRef<HTMLVideoElement>(null), videoClose = useRef<HTMLButtonElement>(null), videoOpener = useRef<HTMLElement | null>(null), returnStop = useRef<string | null>(null);
  const [modal, setModal] = useState(false);
  const videoPanel = useRef<HTMLElement>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [visible, setVisible] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const onMapReady = useCallback(() => setReady(true), []), onMapFailure = useCallback(() => setFailed(true), []);
  const media = tripMedia(trip);
  const active = index === null ? undefined : media[index];
  const selected = active?.kind === 'photo' ? { ...active, photo: active.media } : undefined;
  const clip = active?.kind === 'video' ? { ...active, video: active.media } : undefined;
  const clipVideo = clip?.video;
  const attachPlayer = useCallback((element: HTMLVideoElement | null) => {
    player.current = element;
    if (!element || !clipVideo) return;
    // ReactPlayer 3.4 drops poster and ARIA props; its ref exposes the native video.
    element.poster = clipVideo.poster;
    element.setAttribute('aria-label', clipVideo.title);
    element.dataset.player = 'react-player';
  }, [clipVideo]);
  const stopPlayback = () => {
    player.current?.pause();
    player.current?.removeAttribute('src');
    player.current?.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
    player.current?.load();
    setPlaybackTime(0);
    setPlaybackError(false);
  };
  const activate = (next: number) => {
    const item = media[next];
    if (!item || next === index) return;
    stopPlayback();
    if (!active) videoOpener.current = document.activeElement as HTMLElement;
    if (item.kind === 'photo' && typeof viewer.current?.showModal !== 'function') {
      location.assign(item.media.original?.src ?? item.media.src);
      return;
    }
    if (item.kind === 'photo') setModal(true);
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
  const videoContent = clip && <section ref={videoPanel} className={modal ? 'video-viewer modal-video' : 'video-viewer'} aria-label={clip.video.title} onKeyDown={event => {
    if (event.key === 'Escape' && !modal) { event.preventDefault(); closeVideo(); }
    else if (!modal) navigate(event);
  }}>
    {!modal && <header><div><h2 id={`video-viewer-${trip.id}`}>{clip.place}</h2><time dateTime={clip.date}>{tripDate(clip.date)}</time></div><Button ref={videoClose} onClick={closeVideo}>close</Button></header>}
    <div className="video-frame"><ReactPlayer ref={attachPlayer} key={clip.video.id} src={clip.video.src} controls playsInline preload="none" width="100%" height="100%" fallback={<div className="video-loading">Loading video…</div>} onError={() => setPlaybackError(true)} onLoadedMetadata={event => {
      if (event.currentTarget.videoWidth !== 0) return;
      event.currentTarget.pause();
      setPlaybackError(true);
    }} onTimeUpdate={event => setPlaybackTime(event.currentTarget.currentTime)} onSeeking={event => setPlaybackTime(event.currentTarget.currentTime)}>
      {clip.video.captions && <track kind="captions" src={clip.video.captions} srcLang="en" label="English" default />}
      <a href={clip.video.src}>Open video</a>
    </ReactPlayer></div>
    {clip.video.caption !== null && <p className="media-description">{clip.video.caption ?? clip.video.title}</p>}
    {!modal && navigation}
    {playbackError && <p className="video-review-note" aria-live="polite">This browser could not play this video. Download the original file to view it in a compatible player.</p>}
    <a className="video-original" href={clip.video.original?.src ?? clip.video.src} download>original</a>
    {!modal && <p className="video-position-status" aria-live="off">{failed ? 'Map unavailable' : clip.video.track ? videoPosition(clip.video.track, playbackTime) ? 'GPS' : 'GPS gap' : 'No GPS'}</p>}
    {trip.draft && !clip.video.captions && <p className="video-review-note">Unreviewed audio/captions</p>}
  </section>;
  const Heading = href ? 'h2' : 'h1';
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '150px' });
    observer.observe(root.current!); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const dialog = viewer.current;
    if (!modal || !active || !dialog) return;
    if (!dialog.open) dialog.showModal();
    else if (!dialog.contains(document.activeElement) || (document.activeElement instanceof HTMLButtonElement && document.activeElement.disabled)) dialog.querySelector<HTMLButtonElement>('button')?.focus();
  }, [index]);
  useEffect(() => {
    if (clip && !modal) {
      const focused = document.activeElement;
      if (!videoPanel.current?.contains(focused) || (focused instanceof HTMLButtonElement && focused.disabled)) videoClose.current?.focus();
    } else if (returnStop.current) { const target = videoOpener.current?.isConnected ? videoOpener.current : root.current?.querySelector<HTMLButtonElement>(`button[data-stop-id="${returnStop.current}"]`); target?.focus(); returnStop.current = null; }
  }, [index]);
  return <section ref={root} className="trip-map" aria-label={`${trip.title} travel map`} data-renderer={failed ? 'fallback' : ready ? 'maplibre' : 'loading'}>
    <div className="trip-map-stage">
      <div className="map-static" hidden={ready && !failed}>
        <img className="map-poster" src={region.poster} alt={region.posterAlt} width="1200" height="800" />
        <details className="map-static-photos"><summary>Media and dates</summary>{media.map(item => <a key={item.id} href={item.media.original?.src ?? item.media.src}>{item.place} · <time dateTime={item.date}>{tripDate(item.date)}</time>{item.kind === 'video' && ' · video'}</a>)}</details>
        <small className="map-static-credit"><a href="https://protomaps.com">Protomaps</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://esa-worldcover.org/en/data-access">ESA WorldCover</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)</small>
      </div>
      {visible && !failed && <MapBoundary onFailure={onMapFailure}><MapLibreTripMap key={region.id} trip={trip} region={region.id} modalOpen={modal} activeVideo={modal ? undefined : clip?.video} activeMediaId={modal ? undefined : active?.id} playbackTime={playbackTime} onReady={onMapReady} onFailure={onMapFailure} onPhoto={photo => {
        activate(media.findIndex(item => item.id === photo.id));
      }} onVideo={video => {
        activate(media.findIndex(item => item.id === video.id));
      }} /></MapBoundary>}
      {!modal && videoContent}
      <header className="map-caption"><Heading>{href ? <a className="trip-cover" href={href}>{trip.title}</a> : trip.title}</Heading><time dateTime={trip.month}>{tripDate(trip.month)}</time>{trip.draft && <small>draft</small>}</header>
    </div>
    <dialog ref={viewer} className="photo-viewer" aria-labelledby={`viewer-${trip.id}`} onClose={() => {
      if (!viewer.current?.open) {
        stopPlayback();
        returnStop.current = active?.stopId ?? null;
        setModal(false);
        setIndex(null);
      }
    }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.current?.close();
    }} onKeyDown={navigate}>
      <header><div><h2 id={`viewer-${trip.id}`}>{active?.place ?? trip.title}</h2>{active && <time dateTime={active.date}>{tripDate(active.date)}</time>}</div><Button onClick={() => viewer.current?.close()}>close</Button></header>
      {modal && videoContent}
      {selected && <figure><img src={selected.photo.original?.src ?? selected.photo.src} alt={selected.photo.alt} width={selected.photo.original?.width ?? selected.photo.width} height={selected.photo.original?.height ?? selected.photo.height} />{selected.photo.caption !== null && <figcaption className="media-description">{selected.photo.caption ?? selected.photo.alt}</figcaption>}</figure>}
      {navigation}
    </dialog>
  </section>;
}
