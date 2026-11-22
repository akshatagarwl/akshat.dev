import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { parseTrips, tripMedia } from '../lib/trips';

const trip = parseTrips(JSON.parse(readFileSync('.generated/travel-draft/trips.json', 'utf8')))
  .find(item => item.id === 'siquijor');

test.describe('private Siquijor gallery', () => {
  test.skip(!trip, 'No local Siquijor draft is staged.');

  test('recorded San Juan pin has the exact date on the correct regional map', async ({ page }) => {
    const [item] = tripMedia(trip!);
    const archives: string[] = [];
    page.on('request', request => {
      if (request.url().endsWith('.pmtiles')) archives.push(new URL(request.url()).pathname);
    });
    await page.goto('/travels/siquijor');
    const region = page.getByRole('region', { name: 'Siquijor travel map', exact: true });
    await expect(region).toHaveAttribute('data-renderer', 'maplibre');
    await expect(region.getByRole('button', { name: 'Fit Siquijor', exact: true })).toBeVisible();
    await expect(region.locator('.map-strip-card')).toHaveCount(1);
    await expect(region.locator('.map-strip-card time')).toHaveText('29 Dec 2025');
    await expect(region.locator('.map-strip-card time')).toHaveAttribute('datetime', '2025-12-29');
    expect(archives).toEqual(['/maps/siquijor.pmtiles']);
    const marker = region.locator('.map-exact-pin');
    await expect(marker).toHaveCount(1);
    expect([Number(await marker.getAttribute('data-longitude')), Number(await marker.getAttribute('data-latitude'))])
      .toEqual(item.gps);
    await marker.click();
    const popup = region.locator('.maplibregl-popup');
    await expect(popup.locator('strong')).toHaveText('San Juan');
    await expect(popup.locator('time')).toHaveText('29 Dec 2025');
    await expect(popup).not.toContainText('Recorded photo GPS');
    await expect(popup.getByRole('link')).toHaveCount(0);
    await popup.getByRole('button', { name: 'Close popup' }).click();
    const card = region.locator('.map-strip-card');
    await card.focus();
    await card.press('Enter');
    await card.press('Enter');
    const dialog = region.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toHaveText('San Juan');
    await expect(dialog.locator('img')).toHaveAttribute('alt', /palm.*boat/);
    await expect(dialog.getByRole('button', { name: 'previous' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'next' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('every public-facing copy is sanitized and the exported original remains unchanged', async ({ request }) => {
    const [item] = tripMedia(trip!);
    const provenance = JSON.parse(readFileSync('.generated/travel-draft/siquijor/provenance.json', 'utf8'));
    const digest = createHash('sha256').update(readFileSync(provenance.source)).digest('hex');
    expect(digest).toBe(provenance.sourceSha256);
    for (const size of ['640', '1280', '1800', 'original']) {
      const response = await request.get(`/travels/preview/siquijor/siquijor-palm-${size}.webp`);
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
