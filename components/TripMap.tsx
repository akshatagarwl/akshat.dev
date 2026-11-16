'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator } from 'd3-geo';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import type { TripStop } from '@/lib/trips';
import basemap from '@/data/taiwan-basemap.json';

export function TripMap({ stops, active, onSelect }: { stops: TripStop[]; active: string; onSelect: (id: string) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const behavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [ready, setReady] = useState(false);
  const points = useMemo(() => {
    const project = geoMercator().center([121, 23.7]).scale(3800).translate([200, 210]);
    return stops.filter(s => s.location).map(stop => ({ ...stop, point: project(stop.location!)! }));
  }, [stops]);

  useEffect(() => {
    if (!svg.current) return;
    const element = select(svg.current);
    const z = zoom<SVGSVGElement, unknown>().extent([[0, 0], [400, 420]]).scaleExtent([1, 6]).translateExtent([[0, 0], [400, 420]])
      // Wheel/touch always scroll the document. Native buttons work on every input.
      .touchable(() => false).filter(event => event.type === 'mousedown' && !event.button)
      .on('zoom', event => setTransform(event.transform));
    behavior.current = z;
    element.call(z).on('wheel.zoom', null).on('dblclick.zoom', null);
    setReady(true);
    return () => { element.on('.zoom', null); behavior.current = null; };
  }, []);

  useEffect(() => {
    const point = points.find(p => p.id === active)?.point;
    if (point && svg.current && behavior.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) select(svg.current).call(behavior.current.translateTo, point[0], point[1]);
  }, [active, points]);

  const changeZoom = (factor: number) => {
    if (svg.current && behavior.current) select(svg.current).call(behavior.current.scaleBy, factor);
  };
  const fit = () => { if (svg.current && behavior.current) select(svg.current).call(behavior.current.transform, zoomIdentity); };

  return <aside className="trip-map" aria-label="Taiwan trip map">
    <div className="trip-map-heading"><span>the places</span><span>Taiwan</span></div>
    <svg ref={svg} viewBox="0 0 400 420" role="group" aria-label="Approximate places in Taiwan" className="trip-map-drawing" data-zoom={transform.k.toFixed(2)}>
      <g transform={transform.toString()} aria-hidden="true" className="map-geography">
        <path className="map-neighbours" d={basemap.neighbours} />
        <path className="map-taiwan" d={basemap.taiwan} />
        <text x="203" y="285" className="map-island-label" transform="rotate(-25 203 285)">Taiwan</text>
        <text x="320" y="294" className="map-sea-label" transform="rotate(-90 320 294)">PACIFIC OCEAN</text>
      </g>
      {points.map(stop => {
        const [x, y] = transform.apply(stop.point);
        const visible = x >= 18 && x <= 382 && y >= 18 && y <= 402;
        return <a href={`#stop-${stop.id}`} key={stop.id} tabIndex={visible ? 0 : -1} aria-hidden={!visible || undefined} onClick={() => onSelect(stop.id)} aria-label={`Read ${stop.place}`} aria-current={active === stop.id ? 'location' : undefined} className="map-stop" data-active={active === stop.id}>
          <circle cx={x} cy={y} r="18" fill="transparent" />
          <circle cx={x} cy={y} r="10" className="map-pin-halo" />
          <circle cx={x} cy={y} r="4" className="map-pin" />
          <text x={x + 15} y={y + 4}>{stop.place}</text>
        </a>;
      })}
    </svg>
    <div className="map-toolbar" role="group" aria-label="Map controls">
      <button type="button" onClick={() => changeZoom(1 / 1.4)} disabled={!ready || transform.k <= 1.001} aria-label="Zoom out">−</button>
      <button type="button" onClick={() => changeZoom(1.4)} disabled={!ready || transform.k >= 5.999} aria-label="Zoom in">+</button>
      <button type="button" onClick={fit} disabled={!ready}>Fit Taiwan</button>
      <span aria-hidden="true">{transform.k.toFixed(1)}×</span>
    </div>
    <nav className="map-stop-list" aria-label="Trip stops">{stops.map(stop => <a key={stop.id} href={`#stop-${stop.id}`} onClick={() => onSelect(stop.id)} aria-current={active === stop.id ? 'location' : undefined}>{stop.place}</a>)}</nav>
    <p className="map-note">Approximate places, not a recorded route.</p>
    <small className="map-credit">Map data: Natural Earth · public domain</small>
  </aside>;
}
