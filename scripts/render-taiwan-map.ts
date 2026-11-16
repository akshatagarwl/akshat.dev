import { readFile, writeFile } from 'node:fs/promises';
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';

// Public-domain Natural Earth 1:50m countries, pinned source documented in docs/travel-diary.md.
const source = JSON.parse(await readFile('.generated/travel-map/countries.geojson', 'utf8'));
const projection = geoMercator().center([121, 23.7]).scale(3800).translate([200, 210]).clipExtent([[0, 0], [400, 420]]);
const path = geoPath(projection).digits(2);
const selected = source.features.filter((f: { properties: { ADMIN: string } }) => ['Taiwan', 'China', 'Japan', 'Philippines'].includes(f.properties.ADMIN));
await writeFile('data/taiwan-basemap.json', JSON.stringify({
  sceneNeighbours: selected.filter((f: { properties: { ADMIN: string } }) => f.properties.ADMIN !== 'Taiwan').map((f: GeoPermissibleObjects) => geoPath(geoMercator().center([121, 23.7]).scale(3800).translate([200, 210]).clipExtent([[-650, -650], [1000, 1100]])).digits(2)(f)).join(' '),
  taiwan: path(selected.find((f: { properties: { ADMIN: string } }) => f.properties.ADMIN === 'Taiwan') as GeoPermissibleObjects),
  neighbours: selected.filter((f: { properties: { ADMIN: string } }) => f.properties.ADMIN !== 'Taiwan').map((f: GeoPermissibleObjects) => path(f)).join(' '),
}) + '\n');
console.log('Rendered local Natural Earth basemap. No tiles, API keys or remote map requests.');
