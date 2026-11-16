'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator } from 'd3-geo';
import type { TripStop } from '@/lib/trips';
import type { MapScene } from './three-trip-scene';
import basemap from '@/data/taiwan-basemap.json';

export function TripMap({ stops, active: selected, onSelect, onOpenPhoto, href }: { stops: TripStop[]; active?: string; onSelect?: (id: string) => void; onOpenPhoto?: (id: string) => void; href?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<MapScene | null>(null);
  const markers = useRef(new Map<string, HTMLButtonElement>());
  const [localActive, setActive] = useState(stops[0].id);
  const active = selected ?? localActive;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState(1);
  const stop = stops.find(s => s.id === active) ?? stops[0];
  const choose = (id: string) => { setActive(id); onSelect?.(id); };
  const points = useMemo(() => {
    const project = geoMercator().center([121, 23.7]).scale(3800).translate([200, 210]);
    return stops.filter(s => s.location).map(s => ({ ...s, point: project(s.location!)! as [number, number] }));
  }, [stops]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || typeof ResizeObserver === 'undefined') { setFailed(true); return; }
    let cancelled = false;
    const target = host.current!;
    const observer = new IntersectionObserver(async entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      try {
        const { createTripScene } = await import('./three-trip-scene');
        if (cancelled) return;
        engine.current = createTripScene(target, points, markers.current, setScale, () => {
          engine.current?.dispose(); engine.current = null; if (!cancelled) { setReady(false); setFailed(true); }
        });
        setReady(true);
      } catch { if (!cancelled) { setReady(false); setFailed(true); } }
    }, { rootMargin: '150px' });
    observer.observe(target);
    return () => { cancelled = true; observer.disconnect(); engine.current?.dispose(); engine.current = null; };
  }, [points]);
  useEffect(() => { engine.current?.select(active); }, [active, ready]);

  return <section className={`trip-map${ready ? ' is-three' : ''}`} aria-label="Taiwan trip map" data-renderer={ready ? 'three' : failed ? 'svg' : 'loading'}>
    <div className="trip-map-stage" ref={host} data-zoom={scale.toFixed(2)} tabIndex={ready ? 0 : -1} role="group" aria-label={ready ? 'Taiwan map. Arrow keys pan; Shift and arrow keys turn. Zoom and fit buttons below.' : 'Taiwan map'}>
      <svg viewBox="0 0 400 420" role="group" aria-label="Approximate places in Taiwan" className="trip-map-drawing" aria-hidden={ready || undefined}>
        <g className="map-geography" aria-hidden="true"><path className="map-neighbours" d={basemap.neighbours} /><path className="map-taiwan" d={basemap.taiwan} /></g>
        {points.map(p => <a href={`${href ?? ''}#stop-${p.id}`} key={p.id} className="map-stop" tabIndex={ready ? -1 : 0} aria-label={`Read ${p.place}`}><circle cx={p.point[0]} cy={p.point[1]} r="7" className="map-pin" /><text x={p.point[0] + 13} y={p.point[1] + 4}>{p.place}</text></a>)}
      </svg>
      <div className="map-title"><span>Taiwan</span><small>an atlas of photographs</small></div>
      {points.map(p => <button key={p.id} type="button" ref={node => { if (node) markers.current.set(p.id, node); else markers.current.delete(p.id); }} hidden={!ready} className="three-map-marker" aria-label={`Explore ${p.place}`} aria-pressed={active === p.id} onClick={() => choose(p.id)}>
        <img src={p.photos[0].src.replace('-1800.webp', '-640.webp')} alt="" width="40" height="40" /><span>{p.place}</span>
      </button>)}
      {ready && <article className="map-place-card" aria-label="Selected place">
        <img src={stop.photos[0].src.replace('-1800.webp', '-640.webp')} alt={stop.photos[0].alt} width="208" height="125" />
        <div><small>the photographs</small><h2>{stop.place}</h2>
          {onOpenPhoto ? <button type="button" onClick={() => onOpenPhoto(stop.id)}>View photo</button> : <a className="map-open-trip" href={href}>Explore the trip</a>}
        </div>
      </article>}
      <div className="map-toolbar" role="group" aria-label="Map controls">
        <button type="button" onClick={() => engine.current?.zoom(1 / 1.4)} disabled={!ready || scale <= 1.001} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => engine.current?.zoom(1.4)} disabled={!ready || scale >= 5.999} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => engine.current?.fit()} disabled={!ready}>Fit Taiwan</button>
      </div>
      <p className="map-gesture-note">{ready ? 'Drag to turn · right-drag to pan' : 'A map of the photographs'}</p>
    </div>
    <div className="map-bottom-bar"><nav className="map-stop-list" aria-label="Trip stops">{stops.map(s => <a key={s.id} href={href ? `${href}#stop-${s.id}` : `#stop-${s.id}`} onClick={event => { if (ready && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); choose(s.id); } }} aria-current={active === s.id ? 'location' : undefined}>{s.place}</a>)}</nav><small className="map-credit">Natural Earth · approximate places, not a recorded route</small></div>
  </section>;
}
