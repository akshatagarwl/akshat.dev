'use client';

import { Button } from '@ui-sdk/react/button';

import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Source, Marker, NavigationControl, ScaleControl, type MapRef } from 'react-map-gl/maplibre';
import * as maplibre from 'maplibre-gl';
import { FileSource, PMTiles, Protocol } from 'pmtiles';
import { Play } from 'lucide-react';
import type { RecordedGps, Trip, TripMapItem, TripPhoto, TripVideo } from '@/lib/trips';
import { tripDate, tripMedia, videoPosition } from '@/lib/trips';
import style from '@/data/map-style.json';

// MapLibre owns geography, projection, camera and marker positioning.
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

type Props = {
  trip: Trip; activeVideo?: TripVideo; activeMediaId?: string; playbackTime: number;
  onPhoto: (photo: TripPhoto) => void; onVideo: (video: TripVideo) => void;
  onReady: () => void; onFailure: () => void;
};
type LocatedMedia = TripMapItem & { gps: RecordedGps };

export default function MapLibreTripMap({
  trip, activeVideo, activeMediaId, playbackTime, onPhoto, onVideo, onReady, onFailure,
}: Props) {
  const ref = useRef<MapRef>(null);
  const previousView = useRef<{
    center: [number, number]; zoom: number; bearing: number; pitch: number;
    padding: ReturnType<MapRef['getPadding']>;
  } | null>(null);
  const media = useMemo(() => tripMedia(trip), [trip]);
  const located = media.filter((item): item is LocatedMedia => item.gps !== undefined);

  const strip = useRef<HTMLDivElement>(null);
  const cards = useRef(new globalThis.Map<string, HTMLButtonElement>());
  const swiping = useRef(false);
  const [selected, setSelected] = useState<string>();

  const recordCamera = () => {
    const map = ref.current;
    if (!map || !trip.draft) return;
    const center = map.getCenter(), padding = map.getPadding();
    map.getCanvas().dataset.camera = JSON.stringify([
      center.lng, center.lat, map.getZoom(), map.getBearing(), map.getPitch(),
      padding.top, padding.bottom, padding.left, padding.right,
    ].map(value => Number((value ?? 0).toFixed(7))));
  };

  const select = (item: TripMapItem, revealCard = false) => {
    setSelected(item.id);
    const card = cards.current.get(item.id);
    if (revealCard && card && strip.current) {
      strip.current.scrollTo({ left: card.offsetLeft - (strip.current.clientWidth - card.offsetWidth) / 2 });
    }

    const map = ref.current;
    if (!map || !item.gps || activeVideo?.track) return;
    const point = map.project(item.gps), container = map.getContainer();
    const crowded = located.filter(other => other.id !== item.id &&
      maplibre.LngLat.convert(item.gps!).distanceTo(maplibre.LngLat.convert(other.gps)) < 12000);
    if (crowded.length && map.getZoom() < 9.5) {
      const bounds = new maplibre.LngLatBounds(item.gps, item.gps);
      crowded.forEach(other => bounds.extend(other.gps));
      map.fitBounds(bounds, { duration: 0, maxZoom: 9.5, absolutePadding: true,
        padding: { top: 140, bottom: 180, left: 50, right: 50 } });
    } else if (point.x < 30 || point.x > container.clientWidth - 30 ||
      point.y < 130 || point.y > container.clientHeight - 160) {
      map.panTo(item.gps, { duration: 0 });
    }
  };

  useEffect(() => {
    const item = media.find(item => item.id === activeMediaId);
    if (item) select(item, true);
  }, [activeMediaId]);

  const step = (item: TripMapItem, direction: number) => {
    const index = Math.max(0, Math.min(media.length - 1, media.indexOf(item) + direction));
    const next = media[index];
    select(next, true);
    cards.current.get(next.id)?.focus({ preventScroll: true });
  };

  const selectScrolledCard = () => {
    if (!swiping.current || !strip.current) return;
    swiping.current = false;

    const center = strip.current.scrollLeft + strip.current.clientWidth / 2;
    const nearest = media.toSorted((first, second) => {
      const distance = (item: TripMapItem) => {
        const card = cards.current.get(item.id)!;
        return Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      };
      return distance(first) - distance(second);
    })[0];
    if (nearest) select(nearest);
  };

  const position = videoPosition(activeVideo?.track, playbackTime);
  const route = useMemo(() => {
    const segments: number[][][] = [[]];
    const track = activeVideo?.track ?? [];
    for (const [index, sample] of track.entries()) {
      if (index && sample[0] - track[index - 1][0] > 5) segments.push([]);
      segments[segments.length - 1].push([sample[1], sample[2]]);
    }
    return {
      type: 'Feature' as const, properties: {},
      geometry: { type: 'MultiLineString' as const, coordinates: segments.filter(segment => segment.length > 1) },
    };
  }, [activeVideo]);
  const fitPlayback = () => {
    const map = ref.current, track = activeVideo?.track;
    if (!map || !track?.length) return;
    const longitudes = track.map(sample => sample[1]), latitudes = track.map(sample => sample[2]);
    const container = map.getContainer(), narrow = container.clientWidth < 600;
    const bounds = container.getBoundingClientRect(), stage = container.closest('.trip-map-stage');
    const panel = stage?.querySelector('.video-viewer')?.getBoundingClientRect();
    const caption = stage?.querySelector('.map-caption')?.getBoundingClientRect();
    map.fitBounds([
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ], {
      absolutePadding: true, maxZoom: 17, duration: 0,
      padding: {
        top: caption ? caption.bottom - bounds.top + 24 : 140,
        bottom: narrow ? panel ? bounds.bottom - panel.top + 28 : 390 : 75,
        left: narrow ? 45 : panel ? panel.right - bounds.left + 40 : 430, right: 45,
      },
    });
  };
  const [archiveReady, setArchiveReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadArchive().then(() => { if (!cancelled) setArchiveReady(true); })
      .catch(() => { if (!cancelled) onFailure(); });
    return () => { cancelled = true; };
  }, [onFailure]);
  useEffect(() => {
    const map = ref.current;
    if (!map) return;
    if (activeVideo?.track) {
      previousView.current ??= {
        center: map.getCenter().toArray() as [number, number], zoom: map.getZoom(),
        bearing: map.getBearing(), pitch: map.getPitch(), padding: map.getPadding(),
      };
      fitPlayback();
    } else if (!activeVideo && previousView.current) {
      map.jumpTo(previousView.current);
      previousView.current = null;
    }
    recordCamera();
  }, [activeVideo]);
  const mapStyle = useMemo(() => ({
    ...style, glyphs: `${location.origin}${style.glyphs}`, sprite: `${location.origin}${style.sprite}`,
    sources: { protomaps: { ...style.sources.protomaps, url: 'pmtiles://taiwan.pmtiles' } },
  }) as maplibre.StyleSpecification, []);
  const fit = () => {
    const map = ref.current;
    if (!map || !located.length) return;
    const bounds = new maplibre.LngLatBounds();
    for (const item of located) bounds.extend(item.gps);
    const narrow = map.getContainer().clientWidth < 600;
    map.fitBounds(bounds, {
      absolutePadding: true, maxZoom: 12, duration: 0,
      padding: {
        top: 150, bottom: narrow ? 220 : 180,
        left: narrow ? 44 : 120, right: narrow ? 44 : 120,
      },
    });
  };
  if (!archiveReady) return null;
  return <Map ref={ref} mapLib={maplibre} mapStyle={mapStyle}
    transformRequest={url => ({ url: url.replaceAll('@', '%40') })}
    initialViewState={{ bounds: [[119.5, 21.7], [122.3, 25.4]] }}
    maxBounds={[117, 20, 125, 27]} minZoom={5.7} maxZoom={17}
    scrollZoom={false} touchZoomRotate={false} dragRotate={false} doubleClickZoom={false}
    cooperativeGestures fadeDuration={0} renderWorldCopies={false}
    onResize={() => { if (activeVideo?.track) fitPlayback(); recordCamera(); }}
    onMoveEnd={recordCamera} onIdle={recordCamera}
    onLoad={event => {
      event.target.once('webglcontextlost', onFailure);
      event.target.resize(); fit(); recordCamera(); onReady();
    }}
    onError={event => { console.warn('Local map unavailable:', event.error.message); onFailure(); }}>
    <NavigationControl position="top-right" showCompass={false} />
    <ScaleControl position="bottom-left" />
    <Button className="map-fit" onClick={fit}>Fit Taiwan</Button>
    {activeVideo?.track && <Source id="recorded-video-route" type="geojson" data={route}>
      <Layer id="recorded-video-route-line" type="line"
        paint={{ 'line-color': '#175e9b', 'line-width': 3, 'line-opacity': .75 }} />
    </Source>}
    {position && <Marker longitude={position[0]} latitude={position[1]} anchor="center">
      <span className="video-position-marker" role="img" aria-label="Recorded camera position"
        data-longitude={position[0]} data-latitude={position[1]} data-playback-time={playbackTime} />
    </Marker>}
    {located.map(item => <Marker key={item.id}
      longitude={item.gps[0]} latitude={item.gps[1]} anchor="center">
      <Button className="map-exact-pin" data-media-id={item.id}
        data-longitude={item.gps[0]} data-latitude={item.gps[1]} data-kind={item.kind}
        aria-label={`${item.place}, ${tripDate(item.date)}: ${item.kind === 'photo' ? item.media.alt : item.media.title}`}
        aria-pressed={selected === item.id} onClick={() => select(item, true)} />
    </Marker>)}
    <div className="map-media-strip" ref={strip} hidden={!!activeVideo}
      role="group" aria-label="Photos and videos, chronological order"
      onTouchStart={() => { swiping.current = true; }} onScrollEnd={selectScrolledCard}>
      {media.map((item, index) => {
        const preview = item.kind === 'photo'
          ? item.media.src.replace('-1800.webp', '-640.webp') : item.media.poster;
        const description = item.kind === 'photo' ? item.media.alt : item.media.title;
        return <Button className="map-photo-marker map-strip-card" key={item.id}
          ref={element => {
            if (element) cards.current.set(item.id, element);
            else cards.current.delete(item.id);
          }}
          data-media-id={item.id} data-stop-id={item.stopId} data-kind={item.kind}
          aria-label={`${description}, ${tripDate(item.date)}. ${selected === item.id ? 'Open' : 'Show on map'}`}
          aria-keyshortcuts="ArrowLeft ArrowRight"
          aria-pressed={selected === item.id} title={item.place}
          onPointerEnter={event => { if (event.pointerType === 'mouse') select(item); }}
          onKeyDown={event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            step(item, event.key === 'ArrowRight' ? 1 : -1);
          }}
          onClick={() => {
            if (selected !== item.id) { select(item); return; }
            if (item.kind === 'photo') onPhoto(item.media);
            else onVideo(item.media);
          }}>
          <span className="map-polaroid" style={{ transform: `rotate(${[-3, 2, -1][index % 3]}deg)` }}>
            <img src={preview} alt="" width="86" height="70" />
            {item.kind === 'video' && <Play className="map-polaroid-play" size={12} aria-hidden="true" />}
            <time dateTime={item.date}>{tripDate(item.date)}</time>
          </span>
        </Button>;
      })}
    </div>
  </Map>;
}
