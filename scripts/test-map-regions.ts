import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMapRegion, mapRegions } from '../lib/map-regions';

test('trip ids select regional maps without inspecting or inventing photo GPS', () => {
  assert.equal(getMapRegion('bali'), mapRegions.bali);
  assert.equal(getMapRegion('taiwan'), mapRegions.taiwan);
  assert.equal(getMapRegion('siquijor'), mapRegions.siquijor);
  assert.equal(getMapRegion('amritsar'), mapRegions.amritsar);
  assert.equal(getMapRegion('manali'), mapRegions.manali);
  assert.equal(getMapRegion('toString'), mapRegions.taiwan);
  assert.equal(getMapRegion('legacy-trip'), mapRegions.taiwan);
  assert.equal(getMapRegion('bali', 'taiwan'), mapRegions.taiwan);
  assert.equal(getMapRegion('legacy-trip', 'siquijor'), mapRegions.siquijor);
  assert.equal(getMapRegion('siquijor', 'bali'), mapRegions.bali);
  assert.equal(getMapRegion('legacy-trip', 'amritsar'), mapRegions.amritsar);
  assert.equal(getMapRegion('amritsar', 'taiwan'), mapRegions.taiwan);
  assert.equal(getMapRegion('legacy-trip', 'manali'), mapRegions.manali);
  assert.equal(getMapRegion('manali', 'taiwan'), mapRegions.taiwan);
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
    assert.ok(region.archiveMaxZoom >= region.minZoom && region.archiveMaxZoom < 17);
  }
});

test('Taiwan camera defaults are preserved and Bali covers its island', () => {
  assert.deepEqual(mapRegions.taiwan.bounds, [119.5, 21.7, 122.3, 25.4]);
  assert.deepEqual(mapRegions.taiwan.maxBounds, [117, 20, 125, 27]);
  assert.equal(mapRegions.taiwan.minZoom, 5.7);
  assert.deepEqual(mapRegions.bali.bounds, [114.4, -8.95, 115.75, -8.05]);
  assert.equal(mapRegions.bali.archive, '/maps/bali.pmtiles');
});

test('Amritsar uses a detailed city archive and generic city overview', () => {
  const region = mapRegions.amritsar;
  assert.equal(region.id, 'amritsar');
  assert.equal(region.label, 'Amritsar');
  assert.deepEqual(region.bounds, [74.80, 31.57, 74.97, 31.72]);
  assert.deepEqual(region.maxBounds, [74.75, 31.52, 75.02, 31.77]);
  assert.equal(region.minZoom, 10);
  assert.equal(region.archiveMaxZoom, 13);
  assert.equal(region.archive, '/maps/amritsar.pmtiles');
  assert.equal(region.archiveKey, 'amritsar.pmtiles');
  assert.equal(region.poster, '/maps/amritsar-overview.webp');
  assert.equal(region.posterAlt, 'OpenStreetMap basemap of Amritsar and its surrounding area.');
});

test('Manali uses a detailed regional archive and generic overview', () => {
  const region = mapRegions.manali;
  assert.equal(region.id, 'manali');
  assert.equal(region.label, 'Manali');
  assert.deepEqual(region.bounds, [77.12, 32.18, 77.23, 32.29]);
  assert.deepEqual(region.maxBounds, [77.08, 32.13, 77.28, 32.34]);
  assert.equal(region.minZoom, 11);
  assert.equal(region.archiveMaxZoom, 13);
  assert.equal(region.archive, '/maps/manali.pmtiles');
  assert.equal(region.archiveKey, 'manali.pmtiles');
  assert.equal(region.poster, '/maps/manali-overview.webp');
  assert.equal(region.posterAlt, 'OpenStreetMap basemap of Manali and its surrounding area.');
});

test('Siquijor uses its own island overview and higher-detail archive zoom', () => {
  assert.deepEqual(mapRegions.siquijor.bounds, [123.4, 9.05, 123.76, 9.3]);
  assert.deepEqual(mapRegions.siquijor.maxBounds, [123.35, 8.95, 123.85, 9.4]);
  assert.equal(mapRegions.siquijor.minZoom, 9);
  assert.equal(mapRegions.siquijor.archiveMaxZoom, 12);
  assert.equal(mapRegions.taiwan.archiveMaxZoom, 9);
  assert.equal(mapRegions.bali.archiveMaxZoom, 9);
});
