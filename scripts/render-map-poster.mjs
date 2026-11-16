import { chromium, expect } from '@playwright/test';
import sharp from 'sharp';

// Run against a local map preview; never capture personal markers or popup content.
const url = new URL(process.env.MAP_PREVIEW_URL ?? 'http://127.0.0.1:4321/travels/taiwan');
if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.search || url.hash) throw new Error('Use a plain loopback preview URL.');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page.goto(url.href);
  await expect(page.locator('.trip-map').first()).toHaveAttribute('data-renderer', 'maplibre');
  await page.addStyleTag({ content: '.map-caption,.maplibregl-marker,.maplibregl-popup,.map-fit,.maplibregl-ctrl-top-right,.maplibregl-ctrl-bottom-left {visibility:hidden!important}' });
  await expect(page.locator('.map-photo-marker:visible,.map-caption:visible,.map-photo-popup:visible')).toHaveCount(0);
  const screenshot = await page.locator('.trip-map-stage').first().screenshot();
  await sharp(screenshot).webp({ quality: 86 }).toFile('public/maps/taiwan-overview.webp');
  console.log('Rendered generic MapLibre/Protomaps poster; no personal pins, dates or photographs.');
} finally { await browser.close(); }
