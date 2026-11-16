'use client';

import { useEffect, useRef, useState } from 'react';
import type { Trip } from '@/lib/trips';
import { photoSrcSet } from '@/lib/trips';
import { travelDate } from '@/lib/travels';
import { TripMap } from './TripMap';

export function TripJournal({ trip }: { trip: Trip }) {
  const [active, setActive] = useState(trip.stops[0].id);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const photos = trip.stops.flatMap(stop => stop.photos.map(photo => ({ photo, place: stop.place })));
  const selected = photoIndex === null ? undefined : photos[photoIndex];

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive((entry.target as HTMLElement).dataset.tripStop!);
    }, { rootMargin: '-45% 0px -20% 0px', threshold: 0 });
    root.current?.querySelectorAll('[data-trip-stop]').forEach(stop => observer.observe(stop));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const dialog = viewer.current;
    if (photoIndex === null || !dialog) return;
    if (!dialog.open) dialog.showModal();
    // Reaching an end disables the clicked nav button; keep keyboard focus in the modal.
    else if (!dialog.contains(document.activeElement) || (document.activeElement instanceof HTMLButtonElement && document.activeElement.disabled)) dialog.querySelector<HTMLButtonElement>('button')?.focus();
  }, [photoIndex]);

  return <div ref={root} className="trip-page">
    <header className="trip-masthead">
      <a className="back-link" href="/travels">all travels</a>
      {trip.draft && <p className="trip-draft">local draft · not published</p>}
      <h1>{trip.title}</h1>
      <p className="trip-dateline"><time dateTime={trip.month}>{travelDate(trip.month)}</time><span>photo diary</span></p>
    </header>
    <div className="trip-layout">
      <TripMap stops={trip.stops} active={active} onSelect={setActive} />
      <div className="trip-pages">{trip.stops.map((stop, index) => <section key={stop.id} id={`stop-${stop.id}`} data-trip-stop={stop.id} className="trip-stop" aria-labelledby={`heading-${stop.id}`}>
        <header className="trip-stop-heading"><span className="trip-stop-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h2 id={`heading-${stop.id}`}>{stop.place}</h2></header>
        {trip.draft && stop.locationNote && <p className="trip-location-note">{stop.locationNote}</p>}
        {stop.note && <p className="trip-stop-note">{stop.note}</p>}
        <div className="trip-photographs">{stop.photos.map(photo => <figure key={photo.id}>
          <a href={photo.src} className="trip-photo-link" aria-label={`Open photo: ${photo.alt}`} onClick={event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof viewer.current?.showModal !== 'function') return;
            event.preventDefault(); setPhotoIndex(photos.findIndex(p => p.photo.id === photo.id));
          }}>
            <img src={photo.src} srcSet={photoSrcSet(photo)} sizes="(max-width: 740px) 90vw, 560px" alt={photo.alt} width={photo.width} height={photo.height} loading={index === 0 ? 'eager' : 'lazy'} />
          </a>
          {photo.caption && <figcaption>{photo.caption}</figcaption>}
        </figure>)}</div>
      </section>)}</div>
    </div>
    <dialog ref={viewer} className="photo-viewer" aria-labelledby="viewer-title" onClose={() => setPhotoIndex(null)} onClick={event => { if (event.target === event.currentTarget) viewer.current?.close(); }} onKeyDown={event => {
      if (event.key === 'ArrowRight' && photoIndex !== null) { event.preventDefault(); setPhotoIndex(Math.min(photos.length - 1, photoIndex + 1)); }
      if (event.key === 'ArrowLeft' && photoIndex !== null) { event.preventDefault(); setPhotoIndex(Math.max(0, photoIndex - 1)); }
    }}>
      <header><h2 id="viewer-title">{selected?.place ?? trip.title}</h2><button type="button" onClick={() => viewer.current?.close()}>close</button></header>
      {selected && <figure><img src={selected.photo.src} alt={selected.photo.alt} width={selected.photo.width} height={selected.photo.height} /><figcaption>{selected.photo.caption}</figcaption></figure>}
      <nav aria-label="Photo navigation"><button type="button" disabled={photoIndex === null || photoIndex === 0} onClick={() => setPhotoIndex(i => i === null ? null : Math.max(0, i - 1))}>previous</button><span>{photoIndex === null ? '' : `${photoIndex + 1} / ${photos.length}`}</span><button type="button" disabled={photoIndex === null || photoIndex === photos.length - 1} onClick={() => setPhotoIndex(i => i === null ? null : Math.min(photos.length - 1, i + 1))}>next</button></nav>
    </dialog>
  </div>;
}
