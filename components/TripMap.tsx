'use client';

import dynamic from 'next/dynamic';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Trip, TripVideo } from '@/lib/trips';
import { tripDate } from '@/lib/trips';

const MapLibreTripMap = dynamic(() => import('./MapLibreTripMap'), { ssr: false });
class MapBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function TripMap({ trip, href }: { trip: Trip; href?: string }) {
  const root = useRef<HTMLElement>(null), viewer = useRef<HTMLDialogElement>(null), videoViewer = useRef<HTMLDialogElement>(null);
  const [clip, setClip] = useState<{ video: TripVideo; place: string; date: string } | null>(null);
  const [visible, setVisible] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
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
  useEffect(() => { if (clip && !videoViewer.current?.open) videoViewer.current?.showModal(); }, [clip]);
  return <section ref={root} className="trip-map" aria-label={`${trip.title} travel map`} data-renderer={failed ? 'fallback' : ready ? 'maplibre' : 'loading'}>
    <div className="trip-map-stage">
      <div className="map-static" hidden={ready && !failed}>
        <img className="map-poster" src="/maps/taiwan-overview.webp" alt="OpenStreetMap basemap of Taiwan and its surrounding coast." width="1200" height="800" />
        <details className="map-static-photos"><summary>Media and dates</summary>{photos.map(({ photo, place, date }) => <a key={photo.id} href={photo.src}>{place} · <time dateTime={date}>{tripDate(date)}</time></a>)}{trip.stops.flatMap(stop => stop.videos?.map(video => <a key={video.id} href={video.src}>{stop.place} · <time dateTime={stop.date ?? trip.month}>{tripDate(stop.date ?? trip.month)}</time> · video</a>) ?? [])}</details>
        <small className="map-static-credit"><a href="https://protomaps.com">Protomaps</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://esa-worldcover.org/en/data-access">ESA WorldCover</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)</small>
      </div>
      {visible && !failed && <MapBoundary onFailure={() => setFailed(true)}><MapLibreTripMap trip={trip} onReady={() => setReady(true)} onFailure={() => setFailed(true)} onPhoto={photo => {
        if (typeof viewer.current?.showModal !== 'function') { location.assign(photo.src); return; }
        setIndex(photos.findIndex(p => p.photo.id === photo.id));
      }} onVideo={video => {
        if (typeof videoViewer.current?.showModal !== 'function') { location.assign(video.src); return; }
        const stop = trip.stops.find(s => s.videos?.some(v => v.id === video.id))!;
        setClip({ video, place: stop.place, date: stop.date ?? trip.month });
      }} /></MapBoundary>}
      <header className="map-caption"><Heading>{trip.title}</Heading><time dateTime={trip.month}>{tripDate(trip.month)}</time>{trip.draft && <small>local draft · not published</small>}{href && <a className="trip-cover" href={href}>Explore the map</a>}</header>
    </div>
    <dialog ref={viewer} className="photo-viewer" aria-labelledby={`viewer-${trip.id}`} onClose={() => setIndex(null)} onClick={event => { if (event.target === event.currentTarget) viewer.current?.close(); }} onKeyDown={event => {
      if (event.key === 'ArrowRight' && index !== null) { event.preventDefault(); setIndex(Math.min(photos.length - 1, index + 1)); }
      if (event.key === 'ArrowLeft' && index !== null) { event.preventDefault(); setIndex(Math.max(0, index - 1)); }
    }}>
      <header><div><h2 id={`viewer-${trip.id}`}>{selected?.place ?? trip.title}</h2>{selected && <time dateTime={selected.date}>{tripDate(selected.date)}</time>}</div><button type="button" onClick={() => viewer.current?.close()}>close</button></header>
      {selected && <figure><img src={selected.photo.src} alt={selected.photo.alt} width={selected.photo.width} height={selected.photo.height} /><figcaption>{selected.photo.caption}</figcaption></figure>}
      <nav aria-label="Photo navigation"><button type="button" disabled={index === null || index === 0} onClick={() => setIndex(i => i === null ? null : Math.max(0, i - 1))}>previous</button><span>{index === null ? '' : `${index + 1} / ${photos.length}`}</span><button type="button" disabled={index === null || index === photos.length - 1} onClick={() => setIndex(i => i === null ? null : Math.min(photos.length - 1, i + 1))}>next</button></nav>
    </dialog>
    <dialog ref={videoViewer} className="photo-viewer video-viewer" aria-labelledby={`video-viewer-${trip.id}`} onClose={() => { videoViewer.current?.querySelector('video')?.pause(); setClip(null); }} onClick={event => { if (event.target === event.currentTarget) videoViewer.current?.close(); }}>
      <header><div><h2 id={`video-viewer-${trip.id}`}>{clip?.place ?? trip.title}</h2>{clip && <time dateTime={clip.date}>{tripDate(clip.date)}</time>}</div><button type="button" onClick={() => videoViewer.current?.close()}>close</button></header>
      {clip && <><video key={clip.video.id} src={clip.video.src} poster={clip.video.poster} controls playsInline preload="none" width={clip.video.width} height={clip.video.height} aria-label={clip.video.title}>
        {clip.video.captions && <track kind="captions" src={clip.video.captions} srcLang="en" label="English" default />}
        <a href={clip.video.src}>Open video</a>
      </video><p className="video-description">{clip.video.title}</p>{trip.draft && !clip.video.captions && <p className="video-review-note">Local preview · audio/caption review pending.</p>}</>}
    </dialog>
  </section>;
}
