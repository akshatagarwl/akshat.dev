'use client';

import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Trip, TripVideo } from '@/lib/trips';
import { tripDate, videoPosition } from '@/lib/trips';

const MapLibreTripMap = dynamic(() => import('./MapLibreTripMap'), { ssr: false });
class MapBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function TripMap({ trip, href }: { trip: Trip; href?: string }) {
  const root = useRef<HTMLElement>(null), viewer = useRef<HTMLDialogElement>(null), player = useRef<HTMLVideoElement>(null), videoClose = useRef<HTMLButtonElement>(null), videoOpener = useRef<HTMLElement | null>(null), returnStop = useRef<string | null>(null);
  const [clip, setClip] = useState<{ video: TripVideo; place: string; date: string; stopId: string } | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const closeVideo = () => {
    player.current?.pause(); player.current?.removeAttribute('src'); player.current?.querySelectorAll('source').forEach(source => source.removeAttribute('src')); player.current?.load();
    returnStop.current = clip?.stopId ?? null; setClip(null); setPlaybackTime(0);
  };
  const [visible, setVisible] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const onMapReady = useCallback(() => setReady(true), []), onMapFailure = useCallback(() => setFailed(true), []);
  const photos = trip.stops.flatMap(stop => stop.photos.map(photo => ({ photo, place: stop.place, date: stop.date ?? trip.month })));
  const selected = index === null ? undefined : photos[index];
  const Heading = href ? 'h2' : 'h1';
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '150px' });
    observer.observe(root.current!); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const dialog = viewer.current;
    if (index === null || !dialog) return;
    if (!dialog.open) dialog.showModal();
    else if (!dialog.contains(document.activeElement) || (document.activeElement instanceof HTMLButtonElement && document.activeElement.disabled)) dialog.querySelector<HTMLButtonElement>('button')?.focus();
  }, [index]);
  useEffect(() => {
    if (clip) videoClose.current?.focus();
    else if (returnStop.current) { const target = videoOpener.current?.isConnected ? videoOpener.current : root.current?.querySelector<HTMLButtonElement>(`button[data-stop-id="${returnStop.current}"]`); target?.focus(); returnStop.current = null; }
  }, [clip]);
  return <section ref={root} className="trip-map" aria-label={`${trip.title} travel map`} data-renderer={failed ? 'fallback' : ready ? 'maplibre' : 'loading'}>
    <div className="trip-map-stage">
      <div className="map-static" hidden={ready && !failed}>
        <img className="map-poster" src="/maps/taiwan-overview.webp" alt="OpenStreetMap basemap of Taiwan and its surrounding coast." width="1200" height="800" />
        <details className="map-static-photos"><summary>Media and dates</summary>{photos.map(({ photo, place, date }) => <a key={photo.id} href={photo.original?.src ?? photo.src}>{place} · <time dateTime={date}>{tripDate(date)}</time></a>)}{trip.stops.flatMap(stop => stop.videos?.map(video => <a key={video.id} href={video.original?.src ?? video.src}>{stop.place} · <time dateTime={stop.date ?? trip.month}>{tripDate(stop.date ?? trip.month)}</time> · video</a>) ?? [])}</details>
        <small className="map-static-credit"><a href="https://protomaps.com">Protomaps</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://esa-worldcover.org/en/data-access">ESA WorldCover</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)</small>
      </div>
      {visible && !failed && <MapBoundary onFailure={onMapFailure}><MapLibreTripMap trip={trip} activeVideo={clip?.video} playbackTime={playbackTime} onReady={onMapReady} onFailure={onMapFailure} onPhoto={photo => {
        player.current?.pause();
        if (typeof viewer.current?.showModal !== 'function') { location.assign(photo.original?.src ?? photo.src); return; }
        setIndex(photos.findIndex(p => p.photo.id === photo.id));
      }} onVideo={video => {
        const stop = trip.stops.find(s => s.videos?.some(v => v.id === video.id))!;
        player.current?.pause(); videoOpener.current = document.activeElement as HTMLElement;
        setPlaybackTime(0); setClip({ video, place: stop.place, date: stop.date ?? trip.month, stopId: stop.id });
      }} /></MapBoundary>}
      {clip && <section className="video-viewer" aria-labelledby={`video-viewer-${trip.id}`} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeVideo(); } }}>
        <header><div><h2 id={`video-viewer-${trip.id}`}>{clip.place}</h2><time dateTime={clip.date}>{tripDate(clip.date)}</time></div><button ref={videoClose} type="button" onClick={closeVideo}>close</button></header>
        <video ref={player} key={clip.video.id} poster={clip.video.poster} controls playsInline preload="none" width={clip.video.width} height={clip.video.height} aria-label={clip.video.title} onTimeUpdate={event => setPlaybackTime(event.currentTarget.currentTime)} onSeeking={event => setPlaybackTime(event.currentTarget.currentTime)}>
          <source src={clip.video.src} type="video/mp4" />
          {clip.video.captions && <track kind="captions" src={clip.video.captions} srcLang="en" label="English" default />}
          <a href={clip.video.src}>Open video</a>
        </video>
        <a className="video-original" href={clip.video.original?.src ?? clip.video.src} download>original</a>
        <p className="video-position-status" aria-live="off">{failed ? 'Map unavailable' : clip.video.track ? videoPosition(clip.video.track, playbackTime) ? 'GPS' : 'GPS gap' : 'No GPS'}</p>
        {trip.draft && !clip.video.captions && <p className="video-review-note">Unreviewed audio/captions</p>}
      </section>}
      <header className="map-caption"><Heading>{href ? <a className="trip-cover" href={href}>{trip.title}</a> : trip.title}</Heading><time dateTime={trip.month}>{tripDate(trip.month)}</time>{trip.draft && <small>draft</small>}</header>
    </div>
    <dialog ref={viewer} className="photo-viewer" aria-labelledby={`viewer-${trip.id}`} onClose={() => setIndex(null)} onClick={event => { if (event.target === event.currentTarget) viewer.current?.close(); }} onKeyDown={event => {
      if (event.key === 'ArrowRight' && index !== null) { event.preventDefault(); setIndex(Math.min(photos.length - 1, index + 1)); }
      if (event.key === 'ArrowLeft' && index !== null) { event.preventDefault(); setIndex(Math.max(0, index - 1)); }
    }}>
      <header><div><h2 id={`viewer-${trip.id}`}>{selected?.place ?? trip.title}</h2>{selected && <time dateTime={selected.date}>{tripDate(selected.date)}</time>}</div><button type="button" onClick={() => viewer.current?.close()}>close</button></header>
      {selected && <figure><img src={selected.photo.original?.src ?? selected.photo.src} alt={selected.photo.alt} width={selected.photo.original?.width ?? selected.photo.width} height={selected.photo.original?.height ?? selected.photo.height} /><figcaption>{selected.photo.caption}</figcaption></figure>}
      <nav aria-label="Photo navigation"><button type="button" disabled={index === null || index === 0} onClick={() => setIndex(i => i === null ? null : Math.max(0, i - 1))}>previous</button><span>{index === null ? '' : `${index + 1} / ${photos.length}`}</span><button type="button" disabled={index === null || index === photos.length - 1} onClick={() => setIndex(i => i === null ? null : Math.min(photos.length - 1, i + 1))}>next</button></nav>
    </dialog>
  </section>;
}
