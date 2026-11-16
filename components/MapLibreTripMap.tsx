'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Source, Marker, NavigationControl, Popup, ScaleControl, type MapRef } from 'react-map-gl/maplibre';
import * as maplibre from 'maplibre-gl';
import { FileSource, PMTiles, Protocol } from 'pmtiles';
import type { Trip, TripPhoto, TripVideo } from '@/lib/trips';
import { tripDate, videoDuration, videoPosition } from '@/lib/trips';
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

export default function MapLibreTripMap({ trip, activeVideo, playbackTime, onPhoto, onVideo, onReady, onFailure }: { trip: Trip; activeVideo?: TripVideo; playbackTime: number; onPhoto: (photo: TripPhoto) => void; onVideo: (video: TripVideo) => void; onReady: () => void; onFailure: () => void }) {
  const ref = useRef<MapRef>(null), previousView = useRef<{ center: [number, number]; zoom: number; bearing: number; pitch: number; padding: ReturnType<MapRef['getPadding']> } | null>(null);
  const [places, setPlaces] = useState<{ ids: string[]; clusters: { id: number; longitude: number; latitude: number; count: number; names: string }[] }>({ ids: [], clusters: [] });
  const placeData = useMemo(() => ({ type: 'FeatureCollection' as const, features: trip.stops.filter(s => s.location).map(s => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: s.location! }, properties: { stopId: s.id, label: `${s.place}, ${tripDate(s.date ?? trip.month)}; ` } })) }), [trip]);
  const refreshPlaces = () => {
    const map = ref.current; if (!map) return;
    if (trip.draft) { const center = map.getCenter(), p = map.getPadding(); map.getCanvas().dataset.camera = JSON.stringify([center.lng, center.lat, map.getZoom(), map.getBearing(), map.getPitch(), p.top, p.bottom, p.left, p.right].map(n => Number((n ?? 0).toFixed(7)))); }
    if (!map.getSource('trip-places') || !map.isSourceLoaded('trip-places')) return;
    const ids = new Set<string>(), clusters = new globalThis.Map<number, { id: number; longitude: number; latitude: number; count: number; names: string }>();
    for (const feature of map.queryRenderedFeatures(undefined, { layers: ['trip-places-index'] })) {
      if (feature.geometry.type !== 'Point') continue;
      const p = feature.properties;
      if (p.cluster) clusters.set(p.cluster_id, { id: p.cluster_id, longitude: feature.geometry.coordinates[0], latitude: feature.geometry.coordinates[1], count: p.point_count, names: String(p.names || '').replace(/; $/, '') });
      else if (p.stopId) ids.add(p.stopId);
    }
    const next = { ids: [...ids].sort(), clusters: [...clusters.values()].sort((a, b) => a.id - b.id) };
    setPlaces(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  };
  const [clusterChoices, setClusterChoices] = useState<{ longitude: number; latitude: number; ids: string[] } | null>(null);
  const openStop = (stopId: string) => {
    const target = trip.stops.find(stop => stop.id === stopId);
    if (!target?.location) return;
    setClusterChoices(null);
    ref.current?.easeTo({ center: target.location, zoom: 14, padding: { top: 160, bottom: 0, left: 0, right: 0 }, duration: 0 });
    select(stopId);
  };
  const position = videoPosition(activeVideo?.track, playbackTime);
  const route = useMemo(() => {
    const segments: number[][][] = [[]];
    for (const [i, p] of (activeVideo?.track ?? []).entries()) { if (i && p[0] - activeVideo!.track![i - 1][0] > 5) segments.push([]); segments[segments.length - 1].push([p[1], p[2]]); }
    return { type: 'Feature' as const, properties: {}, geometry: { type: 'MultiLineString' as const, coordinates: segments.filter(s => s.length > 1) } };
  }, [activeVideo]);
  const fitPlayback = () => {
    const map = ref.current, track = activeVideo?.track; if (!map || !track?.length) return;
    const xs = track.map(p => p[1]), ys = track.map(p => p[2]), container = map.getContainer(), narrow = container.clientWidth < 600;
    const bounds = container.getBoundingClientRect(), stage = container.closest('.trip-map-stage');
    const panel = stage?.querySelector('.video-viewer')?.getBoundingClientRect(), caption = stage?.querySelector('.map-caption')?.getBoundingClientRect();
    map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { absolutePadding: true, maxZoom: 17, padding: { top: caption ? caption.bottom - bounds.top + 24 : 140, bottom: narrow ? panel ? bounds.bottom - panel.top + 28 : 390 : 75, left: narrow ? 45 : panel ? panel.right - bounds.left + 40 : 430, right: 45 }, duration: 0 });
  };
  const [archiveReady, setArchiveReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadArchive().then(() => { if (!cancelled) setArchiveReady(true); }).catch(() => { if (!cancelled) onFailure(); });
    return () => { cancelled = true; };
  }, [onFailure]);
  const [selected, select] = useState<string | null>(null);
  const stop = trip.stops.find(s => s.id === selected);
  useEffect(() => {
    const map = ref.current; if (!map) return;
    if (activeVideo) {
      select(null);
      if (activeVideo.track) { previousView.current ??= { center: map.getCenter().toArray() as [number, number], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), padding: map.getPadding() }; fitPlayback(); }
    } else if (previousView.current) { map.jumpTo(previousView.current); previousView.current = null; }
  }, [activeVideo]);
  const mapStyle = useMemo(() => ({ ...style, glyphs: `${location.origin}${style.glyphs}`, sprite: `${location.origin}${style.sprite}`, sources: { protomaps: { ...style.sources.protomaps, url: 'pmtiles://taiwan.pmtiles' } } }) as maplibre.StyleSpecification, []);
  const fit = () => ref.current?.fitBounds([[119.5, 21.7], [122.3, 25.4]], { absolutePadding: true, padding: { top: 90, bottom: 60, left: 40, right: 40 }, duration: 0 });
  if (!archiveReady) return null;
  // Encode retina sprite paths up front: avoid static-host redirects from raw '@'.
  return <Map ref={ref} mapLib={maplibre} mapStyle={mapStyle} transformRequest={url => ({ url: url.replaceAll('@', '%40') })} initialViewState={{ bounds: [[119.5, 21.7], [122.3, 25.4]], fitBoundsOptions: { padding: { top: 90, bottom: 60, left: 40, right: 40 } } }}
    maxBounds={[117, 20, 125, 27]} minZoom={5.7} maxZoom={17} scrollZoom={false} touchZoomRotate={false} dragRotate={false} doubleClickZoom={false} cooperativeGestures fadeDuration={0} renderWorldCopies={false}
    onResize={activeVideo?.track ? fitPlayback : undefined} onIdle={refreshPlaces} onLoad={event => { event.target.once('webglcontextlost', onFailure); fit(); onReady(); }} onError={event => { console.warn('Local map unavailable:', event.error.message); onFailure(); }} onClick={() => select(null)}>
    <NavigationControl position="top-right" showCompass={false} />
    <ScaleControl position="bottom-left" />
    <button type="button" className="map-fit" onClick={fit}>Fit Taiwan</button>
    <Source id="trip-places" type="geojson" data={placeData} cluster clusterRadius={120} clusterMaxZoom={13} clusterProperties={{ names: ['concat', ['get', 'label']] }}><Layer id="trip-places-index" type="circle" paint={{ 'circle-radius': 1, 'circle-opacity': 0 }} /></Source>
    {places.clusters.map(cluster => <Marker key={`cluster-${cluster.id}`} longitude={cluster.longitude} latitude={cluster.latitude} anchor="center"><button type="button" className="map-cluster-marker" data-cluster-id={cluster.id} aria-label={`Choose places: ${cluster.names}`} onClick={event => {
      event.stopPropagation(); const source = ref.current?.getSource('trip-places') as maplibre.GeoJSONSource | undefined;
      source?.getClusterLeaves(cluster.id, trip.stops.length, 0).then(features => {
        if (ref.current?.getSource('trip-places') !== source) return;
        select(null);
        setClusterChoices({ longitude: cluster.longitude, latitude: cluster.latitude, ids: features.map(feature => String(feature.properties?.stopId)) });
      }).catch(error => console.warn('Unable to open map cluster:', error));
    }}>{cluster.count}<span>places</span></button></Marker>)}
    {clusterChoices && <Popup longitude={clusterChoices.longitude} latitude={clusterChoices.latitude} closeOnClick={false} maxWidth="240px" onClose={() => setClusterChoices(null)}>
      <nav className="map-cluster-choices" aria-label="Places in this cluster">
        {trip.stops.filter(stop => clusterChoices.ids.includes(stop.id)).map(stop => (
          <button key={stop.id} type="button" onClick={event => {
            event.stopPropagation();
            openStop(stop.id);
          }}>
            Choose {stop.place}
            <time dateTime={stop.date ?? trip.month}>{tripDate(stop.date ?? trip.month)}</time>
          </button>
        ))}
      </nav>
    </Popup>}
    {activeVideo?.track && <Source id="recorded-video-route" type="geojson" data={route}><Layer id="recorded-video-route-line" type="line" paint={{ 'line-color': '#175e9b', 'line-width': 3, 'line-opacity': .75 }} /></Source>}
    {position && <Marker longitude={position[0]} latitude={position[1]} anchor="center"><span className="video-position-marker" role="img" aria-label="Recorded camera position" data-longitude={position[0]} data-latitude={position[1]} data-playback-time={playbackTime} /></Marker>}
    {trip.stops.filter(s => s.location && places.ids.includes(s.id) && !s.videos?.some(v => v.id === activeVideo?.id)).map(s => <Marker key={s.id} longitude={s.location![0]} latitude={s.location![1]} anchor="bottom">
      <button type="button" className="map-photo-marker" data-stop-id={s.id} aria-label={`Explore ${s.place}, ${tripDate(s.date ?? trip.month)}`} aria-pressed={selected === s.id} onClick={event => { event.stopPropagation(); ref.current?.easeTo({ center: s.location!, padding: { top: 160, bottom: 0, left: 0, right: 0 }, duration: 0 }); select(s.id); }}>
        <img src={s.photos[0]?.src.replace('-1800.webp', '-640.webp') ?? s.videos![0].poster} alt="" width="36" height="36" /><span>{s.place}<time dateTime={s.date ?? trip.month}>{tripDate(s.date ?? trip.month)}</time>{s.videos?.length ? <small className="map-video-badge">video</small> : null}</span>
      </button>
    </Marker>)}
    {stop?.location && <Popup longitude={stop.location[0]} latitude={stop.location[1]} anchor="bottom" offset={12} closeOnClick={false} maxWidth="240px" focusAfterOpen={false} onClose={() => select(null)}>
      <article className="map-photo-popup"><h2>{stop.place}</h2><time dateTime={stop.date ?? trip.month}>{tripDate(stop.date ?? trip.month)}</time>
        {trip.draft && stop.locationNote && <p className="map-location-note">{stop.locationNote}</p>}
        {stop.photos.map(photo => <a key={photo.id} href={photo.original?.src ?? photo.src} aria-label={`Open photo: ${photo.alt}`} onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onPhoto(photo); }}>
          <img src={photo.src.replace('-1800.webp', '-640.webp')} alt={photo.alt} width={photo.width} height={photo.height} />
        </a>)}
        {stop.videos?.map(video => <a className="map-video-link" key={video.id} href={video.original?.src ?? video.src} aria-label={`Play video: ${video.title}`} onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onVideo(video); }}>
          <img src={video.poster} alt={video.title} width={video.width} height={video.height} /><span>Play video · {videoDuration(video.duration)}</span>
        </a>)}
      </article>
    </Popup>}
  </Map>;
}
