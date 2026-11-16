'use client';

import { useEffect, useRef } from 'react';
import { createGarden, PRESETS, type Garden, type Style } from '@/vendor/seedbed/engine.js';

const colors = ['#e477a6', '#a58bdd', '#efb946', '#ec8d55', '#6aa9ce', '#d65c7b', '#f3d86a', '#8d9cdb'];

export default function FlowerGarden({ side }: { side?: 'left' | 'right' }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let garden: Garden | undefined;
    const style = (): Style => ({
      ...PRESETS.meadow,
      card: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
      dot: '#d4cfbf',
      petals: colors,
      heads: ['cosmos', 'daisy', 'tulip', 'spike'],
    });
    const mount = () => {
      garden?.destroy();
      garden = undefined;
      element.dataset.state = 'still';
      if (motion.matches) return;
      garden = createGarden(element, {
        preset: 'meadow', custom: style(), night: false,
        pitch: side ? 38 : 32, radius: side ? 110 : 150, height: 1.65,
        speed: 1.15, wiltDelay: 550, maxBlooms: side ? 64 : 120,
        seed: side === 'right' ? 31 : 17, ghost: !side,
      });
      element.dataset.state = element.querySelector('canvas') ? 'live' : 'still';
    };
    mount();
    motion.addEventListener('change', mount);
    return () => {
      garden?.destroy();
      motion.removeEventListener('change', mount);
    };
  }, [side]);
  return <div ref={host} className={`flower-garden ${side ? `garden-margin garden-${side}` : 'garden-main'}`} aria-hidden="true">
    <img className="garden-fallback" loading={side ? 'lazy' : 'eager'} decoding="async" src={side ? '/garden-margin.png' : '/garden-fallback.png'} width={side ? 180 : 640} height={side ? 900 : 224} alt="" />
  </div>;
}
