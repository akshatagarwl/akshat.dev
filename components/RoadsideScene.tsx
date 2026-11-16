import { Bike, MountainSnow, Waves, Shell, Sprout } from 'lucide-react';

/** An imagined landscape, not a map or a claim about places visited. */
export function RoadsideScene() {
  const road = 'M24 166C88 166 70 111 145 114S190 204 274 163 300 62 389 96 458 153 515 118 560 56 614 76';
  return <div className="roadside-scene" aria-hidden="true">
    <svg viewBox="0 0 640 230" fill="none" className="roadside-drawing">
      <g className="mountain-ink"><MountainSnow x={51} y={25} width={83} height={83} strokeWidth={.8} /><path d="M14 112q55-18 125-3m-110 14q68-13 104-3m-79 13 58-4" /></g>
      <g className="field-ink"><Sprout x={272} y={86} width={21} height={21} strokeWidth={1} /><path d="m237 91 2-5m10 13 3-3m-12-23 2-4m29 137 2-5m14-2 3-4m10 14 2-5" /></g>
      <g className="shore-ink"><Waves x={493} y={151} width={78} height={42} strokeWidth={.8} /><Shell x={581} y={129} width={18} height={18} strokeWidth={1} /><path d="M462 162q-20 18-15 36m16-20q-10 12-8 26m-14-50q-21 18-16 41" /></g>
      <path className="road-bed" d={road} />
      <path className="road-inner" d={road} />
      <path className="road-progress" d={road} pathLength="1" />
      <g className="road-bicycle"><Bike x={-12} y={-20} width={24} height={24} strokeWidth={1.35} /></g>
      <g className="road-seeds"><circle cx="174" cy="50" r="2" /><circle cx="186" cy="42" r="1" /><circle cx="425" cy="61" r="1.5" /></g>
    </svg>
  </div>;
}
