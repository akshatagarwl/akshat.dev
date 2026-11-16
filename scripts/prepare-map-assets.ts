import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { layers, namedFlavor } from '@protomaps/basemaps';

// Maintained upstream map/style assets. No hand-built coastlines, terrain or map renderer.
const revision = '028c18f713baecad011301ff7a69acc39bcc2ae7';
const source = `https://raw.githubusercontent.com/protomaps/basemaps-assets/${revision}`;
const assets = [
  ...['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'].flatMap(font => [0, 256, 512, 768].map(start => `fonts/${font}/${start}-${start + 255}.pbf`)),
  ...['.json', '.png', '@2x.json', '@2x.png'].map(suffix => `sprites/v4/light${suffix}`),
];
for (const asset of assets) {
  const response = await fetch(`${source}/${asset.split('/').map(encodeURIComponent).join('/')}`);
  if (!response.ok) throw new Error(`Map asset ${asset}: HTTP ${response.status}`);
  const destination = `public/maps/${asset}`;
  await mkdir(destination.slice(0, destination.lastIndexOf('/')), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}
await copyFile('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', 'public/maps/maplibre-worker.mjs');
const styleLayers = layers('protomaps', namedFlavor('light'), { lang: 'en' });
// English labels only: reuse upstream cartography without downloading global CJK fonts.
for (const layer of styleLayers) if (layer.type === 'symbol' && layer.layout?.['text-field'] && JSON.stringify(layer.layout['text-field']).includes('name')) layer.layout['text-field'] = ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ''];
await writeFile('data/map-style.json', JSON.stringify({
  version: 8, name: 'Protomaps Light (English)',
  glyphs: '/maps/fonts/{fontstack}/{range}.pbf', sprite: '/maps/sprites/v4/light',
  sources: { protomaps: { type: 'vector', url: 'pmtiles:///maps/taiwan.pmtiles', maxzoom: 9, attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://esa-worldcover.org/en/data-access">ESA WorldCover</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)' } },
  layers: styleLayers,
}) + '\n');
console.log(`Prepared ${assets.length} pinned local map assets and the upstream light style.`);
