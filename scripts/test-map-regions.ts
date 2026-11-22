import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMapRegion, mapRegions } from '../lib/map-regions';

test('trip ids select regional maps without inspecting or inventing photo GPS', () => {
  assert.equal(getMapRegion('bali'), mapRegions.bali);
  assert.equal(getMapRegion('taiwan'), mapRegions.taiwan);
  assert.equal(getMapRegion('legacy-trip'), mapRegions.taiwan);
  assert.equal(getMapRegion('bali', 'taiwan'), mapRegions.taiwan);
});

test('regional archives and PMTiles FileSource cache keys remain distinct', () => {
  const regions = Object.values(mapRegions);
  for (const field of ['archive', 'archiveKey', 'poster'] as const) {
    assert.equal(new Set(regions.map(region => region[field])).size, regions.length);
  }
  for (const region of regions) {
    assert.equal(region.archive, `/maps/${region.archiveKey}`);
    assert.equal(region.poster, `/maps/${region.id}-overview.webp`);
    assert.ok(region.posterAlt.includes(region.label));
    const [west, south, east, north] = region.bounds;
    const [maxWest, maxSouth, maxEast, maxNorth] = region.maxBounds;
    assert.ok(maxWest <= west && west < east && east <= maxEast);
    assert.ok(maxSouth <= south && south < north && north <= maxNorth);
    assert.ok(region.minZoom > 0 && region.minZoom < 17);
  }
});

test('Taiwan camera defaults are preserved and Bali covers its island', () => {
  assert.deepEqual(mapRegions.taiwan.bounds, [119.5, 21.7, 122.3, 25.4]);
  assert.deepEqual(mapRegions.taiwan.maxBounds, [117, 20, 125, 27]);
  assert.equal(mapRegions.taiwan.minZoom, 5.7);
  assert.deepEqual(mapRegions.bali.bounds, [114.4, -8.95, 115.75, -8.05]);
  assert.equal(mapRegions.bali.archive, '/maps/bali.pmtiles');
});
