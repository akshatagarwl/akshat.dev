'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker, NavigationControl, Popup, ScaleControl, type MapRef } from 'react-map-gl/maplibre';
import * as maplibre from 'maplibre-gl';
import { FileSource, PMTiles, Protocol } from 'pmtiles';
import type { Trip, TripPhoto } from '@/lib/trips';
import { tripDate } from '@/lib/trips';
import style from '@/data/map-style.json';

// Existing renderer, React components, worker, PMTiles reader and Protomaps cartography.
// Only photo/date content and component composition belong to this site.
const protocol = new Protocol();
maplibre.addProtocol('pmtiles', protocol.tile);
maplibre.setWorkerUrl('/maps/maplibre-worker.mjs');
maplibre.setWorkerCount(1);
let archive: Promise<void> | undefined;
function loadArchive() {
  // Assets-only hosts need not implement Range requests. Reuse PMTiles' FileSource.
  return archive ??= fetch('/maps/taiwan.pmtiles').then(async response => {
    if (!response.ok) throw new Error('Local basemap unavailable.');
    protocol.add(new PMTiles(new FileSource(new File([await response.arrayBuffer()], 'taiwan.pmtiles'))));
  });
}

export default function MapLibreTripMap({ trip, onPhoto, onReady, onFailure }: { trip: Trip; onPhoto: (photo: TripPhoto) => void; onReady: () => void; onFailure: () => void }) {
  const ref = useRef<MapRef>(null);
  const [archiveReady, setArchiveReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadArchive().then(() => { if (!cancelled) setArchiveReady(true); }).catch(() => { if (!cancelled) onFailure(); });
    return () => { cancelled = true; };
  }, [onFailure]);
  const [selected, select] = useState<string | null>(null);
  const stop = trip.stops.find(s => s.id === selected);
  const mapStyle = useMemo(() => ({ ...style, glyphs: `${location.origin}${style.glyphs}`, sprite: `${location.origin}${style.sprite}`, sources: { protomaps: { ...style.sources.protomaps, url: 'pmtiles://taiwan.pmtiles' } } }) as maplibre.StyleSpecification, []);
  const fit = () => ref.current?.fitBounds([[119.5, 21.7], [122.3, 25.4]], { padding: { top: 90, bottom: 60, left: 40, right: 40 }, duration: 0 });
  if (!archiveReady) return null;
  // Encode retina sprite paths up front: avoid static-host redirects from raw '@'.
  return <Map ref={ref} mapLib={maplibre} mapStyle={mapStyle} transformRequest={url => ({ url: url.replaceAll('@', '%40') })} initialViewState={{ bounds: [[119.5, 21.7], [122.3, 25.4]], fitBoundsOptions: { padding: { top: 90, bottom: 60, left: 40, right: 40 } } }}
    maxBounds={[117, 20, 125, 27]} minZoom={5.7} maxZoom={11.5} scrollZoom={false} touchZoomRotate={false} dragRotate={false} doubleClickZoom={false} cooperativeGestures fadeDuration={0} renderWorldCopies={false}
    onResize={fit} onLoad={event => { event.target.once('webglcontextlost', onFailure); onReady(); }} onError={event => { console.warn('Local map unavailable:', event.error.message); onFailure(); }} onClick={() => select(null)}>
    <NavigationControl position="top-right" showCompass={false} />
    <ScaleControl position="bottom-left" />
    <button type="button" className="map-fit" onClick={fit}>Fit Taiwan</button>
    {trip.stops.filter(s => s.location).map(s => <Marker key={s.id} longitude={s.location![0]} latitude={s.location![1]} anchor="bottom">
      <button type="button" className="map-photo-marker" aria-label={`Explore ${s.place}, ${tripDate(s.date ?? trip.month)}`} aria-pressed={selected === s.id} onClick={event => { event.stopPropagation(); select(s.id); }}>
        <img src={s.photos[0].src.replace('-1800.webp', '-640.webp')} alt="" width="36" height="36" /><span>{s.place}<time dateTime={s.date ?? trip.month}>{tripDate(s.date ?? trip.month)}</time></span>
      </button>
    </Marker>)}
    {stop?.location && <Popup longitude={stop.location[0]} latitude={stop.location[1]} offset={12} closeOnClick={false} maxWidth="min(270px, calc((100vw - 64px) * .65))" onClose={() => select(null)}>
      <article className="map-photo-popup"><h2>{stop.place}</h2><time dateTime={stop.date ?? trip.month}>{tripDate(stop.date ?? trip.month)}</time>
        {trip.draft && stop.locationNote && <p className="map-location-note">{stop.locationNote}</p>}
        {stop.photos.map(photo => <a key={photo.id} href={photo.src} aria-label={`Open photo: ${photo.alt}`} onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onPhoto(photo); }}>
          <img src={photo.src.replace('-1800.webp', '-640.webp')} alt={photo.alt} width={photo.width} height={photo.height} />
        </a>)}
      </article>
    </Popup>}
  </Map>;
}
