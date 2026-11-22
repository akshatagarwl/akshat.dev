import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { parseTrips, tripMedia } from '../lib/trips';

const trips = parseTrips(JSON.parse(readFileSync('.generated/travel-draft/trips.json', 'utf8')));
const fixtures = [
  { id: 'siquijor', label: 'Siquijor', date: '2025-12-29', dateText: '29 Dec 2025', place: 'San Juan', alt: /palm.*boat/ },
  { id: 'amritsar', label: 'Amritsar', date: '2026-06-05', dateText: '5 Jun 2026', place: 'Golden Temple', alt: /Golden Temple.*reflection/ },
  { id: 'manali', label: 'Manali', date: '2026-02-08', dateText: '8 Feb 2026', place: 'Old Manali', alt: /Snowy mountains.*AeroPress.*left edge/ },
];

function projectPoint(matrix: number[][], point: number[]) {
  const values = matrix.map(row => row[0] * point[0] + row[1] * point[1] + row[2]);
  return [values[0] / values[2], values[1] / values[2]];
}

test('Manali crop keeps the unmoved product half out of frame and the sill level', () => {
  test.skip(!trips.some(trip => trip.id === 'manali'), 'No local Manali edit is staged.');
  const edit = JSON.parse(readFileSync('.generated/travel-draft/manali/provenance.json', 'utf8'));
  const matrix = edit.perspectiveMatrixCanonical1000;
  const axis = edit.alignmentLandmarksCanonical.productAxis.map((point: number[]) => projectPoint(matrix, point));
  const sill = edit.alignmentLandmarksCanonical.sill.map((point: number[]) => projectPoint(matrix, point));
  expect(Math.abs(axis[0][0] - axis[1][0])).toBeLessThan(0.01);
  expect(Math.abs(sill[0][1] - sill[1][1])).toBeLessThan(0.01);
  expect(edit.foregroundTranslationCanonicalPixels).toBe(0);
  const croppedAxis = axis[0][0] - edit.cropCanonical[0];
  const scale = edit.sourceDimensions[0] / 1000;
  expect(Math.abs(croppedAxis * scale)).toBeLessThan(1);
});

for (const fixture of fixtures) {
  const trip = trips.find(item => item.id === fixture.id);
  test.describe(`private ${fixture.label} gallery`, () => {
    test.skip(!trip, 'No local regional draft is staged.');

    test('recorded pin has the exact date on the correct regional map', async ({ page }) => {
      const [item] = tripMedia(trip!);
      const archives: string[] = [];
      page.on('request', request => {
        if (request.url().endsWith('.pmtiles')) archives.push(new URL(request.url()).pathname);
      });
      await page.goto(`/travels/${fixture.id}`);
      const region = page.getByRole('region', { name: `${fixture.label} travel map`, exact: true });
      await expect(region).toHaveAttribute('data-renderer', 'maplibre');
      await expect(region.getByRole('button', { name: `Fit ${fixture.label}`, exact: true })).toBeVisible();
      await expect(region.locator('.map-strip-card')).toHaveCount(1);
      await expect(region.locator('.map-strip-card time')).toHaveText(fixture.dateText);
      await expect(region.locator('.map-strip-card time')).toHaveAttribute('datetime', fixture.date);
      expect(archives).toEqual([`/maps/${fixture.id}.pmtiles`]);
      const marker = region.locator('.map-exact-pin');
      await expect(marker).toHaveCount(1);
      expect([Number(await marker.getAttribute('data-longitude')), Number(await marker.getAttribute('data-latitude'))])
        .toEqual(item.gps);
      await marker.click();
      const popup = region.locator('.maplibregl-popup');
      await expect(popup.locator('strong')).toHaveText(fixture.place);
      await expect(popup.locator('time')).toHaveText(fixture.dateText);
      await expect(popup).not.toContainText('Recorded photo GPS');
      await expect(popup.getByRole('link')).toHaveCount(0);
      await popup.getByRole('button', { name: 'Close popup' }).click();
      const card = region.locator('.map-strip-card');
      await card.focus();
      await card.press('Enter');
      await card.press('Enter');
      const dialog = region.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading')).toHaveText(fixture.place);
      await expect(dialog.locator('img')).toHaveAttribute('alt', fixture.alt);
      await expect(dialog.getByRole('button', { name: 'previous' })).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'next' })).toBeDisabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test('every copy is sanitized and the exported original remains unchanged', async ({ request }) => {
      const [item] = tripMedia(trip!);
      const provenance = JSON.parse(readFileSync(`.generated/travel-draft/${fixture.id}/provenance.json`, 'utf8'));
      const digest = createHash('sha256').update(readFileSync(provenance.source)).digest('hex');
      expect(digest).toBe(provenance.sourceSha256);
      for (const size of ['640', '1280', '1800', 'original']) {
        const response = await request.get(item.media.src.replace('-1800.webp', `-${size}.webp`));
        expect(response.ok()).toBe(true);
        const metadata = await sharp(await response.body()).metadata();
        expect(metadata.exif).toBeUndefined();
        expect(metadata.xmp).toBeUndefined();
        expect(metadata.iptc).toBeUndefined();
        expect(metadata.width).toBe(size === 'original' ? item.media.original!.width : Number(size));
        if (size === 'original') expect(metadata.height).toBe(item.media.original!.height);
      }
    });
  });
}
