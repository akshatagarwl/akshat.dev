import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { TravelTrail } from '../components/TravelTrail';
import { parseTravels, travelDate } from '../lib/travels';

const fixture = [
  { id: 'coast-fixture', date: '2025-06', place: 'Coast page', region: 'Layout fixture, not a real trip', terrain: 'coast', note: 'A diary page is read by scrolling, not by opening a card.\nThe sea and a quiet stretch of road.', photos: [{ src: '/travels/fixture-one.webp', alt: 'Illustration used only as a test photo', caption: 'Fixture image, not a travel photograph.' }, { src: '/travels/fixture-two.webp', alt: 'Second test illustration' }] },
  { id: 'hill-fixture', date: '2024-10', place: 'Mountain page', terrain: 'mountain', note: 'An older page, farther down the same path.' },
];
const sorted = parseTravels([...fixture].reverse());
assert.equal(sorted[0].id, 'coast-fixture');
assert.equal(travelDate('2025-06'), 'Jun 2025');
assert.deepEqual(parseTravels([]), []);
assert.equal(renderToStaticMarkup(<TravelTrail stops={[]} />), '', 'No section or placeholder until real travels exist.');
for (const invalid of [null, {}, [{ id: 'bad id' }], [{ id: 'x', date: '2025-13', place: 'x' }], [fixture[0], fixture[0]], [{ ...fixture[0], terrain: 'unknown' }], [{ ...fixture[0], photos: [{ src: 'https://example.com/photo.jpg', alt: 'external' }] }], [{ ...fixture[0], photos: [{ src: '/travels/../secret.jpg', alt: 'traversal' }] }], [{ ...fixture[0], photos: [{ src: '/travels/a.jpg', alt: '' }] }]]) assert.throws(() => parseTravels(invalid));
const html = renderToStaticMarkup(<TravelTrail stops={sorted} />);
assert.ok(html.includes('Coast page') && html.includes('Mountain page'));
assert.ok(html.includes('dateTime="2025-06"'));
assert.ok(!html.includes('<details'));
const escaped = renderToStaticMarkup(<TravelTrail stops={parseTravels([{ id: 'escape', date: '2025-01', place: '<script>bad()</script>', note: '<img onerror=bad()>' }])} />);
assert.ok(!escaped.includes('<script>bad()'));
assert.ok(escaped.includes('&lt;img'));
await mkdir('.generated', { recursive: true });
await writeFile('.generated/travel-fixture.html', html);
console.log('Travel checks pass: empty state, sorting, date precision, validation, local photos, escaping and visible diary pages. Fixture stays outside the public export.');
