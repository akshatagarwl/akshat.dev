import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { existsSync, readFileSync } from 'node:fs';
import { videoPosition } from '../lib/trips';
import { spawnSync } from 'node:child_process';

const trip = '/travels/taiwan';
const draft = JSON.parse(readFileSync('.generated/travel-draft/trips.json', 'utf8'))[0];
const mediaCount = draft.stops.reduce((count: number, stop: { photos: unknown[]; videos?: unknown[] }) => count + stop.photos.length + (stop.videos?.length ?? 0), 0);
const reveal = async (page: import('@playwright/test').Page, place: string) => {
  const marker = page.getByRole('button', { name: new RegExp(`^Explore ${place},`) });
  for (let attempt = 0; attempt < 8; attempt++) {
    const cluster = page.getByRole('button', { name: new RegExp(`^Choose places:.*${place}`) });
    await expect.poll(async () => await marker.isVisible() || await cluster.isVisible()).toBe(true);
    if (await marker.isVisible()) return marker;
    await cluster.click();
    await page.getByRole('button', { name: new RegExp(`^Choose ${place}`) }).click();
    await page.locator('.maplibregl-popup-close-button').click();
    await expect(marker).toBeVisible();
  }
  await expect(marker).toBeVisible();
  return marker;
};
const ready = async (page: import('@playwright/test').Page) => {
  await page.goto(trip);
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'maplibre');
};

test('maintained MapLibre component is the only travel surface and dates are visible', async ({ page }) => {
  const external: string[] = [], errors: string[] = [], failures: string[] = [];
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:4323') && !r.url().startsWith('data:')) external.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  await page.goto('/');
  await page.locator('#travels .trip-cover').click();
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'maplibre');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect(page.locator('.trip-pages, .trip-stop, .trip-masthead, .map-geography')).toHaveCount(0);
  await expect(page.locator('.map-caption > time')).toHaveText('Oct 2026');
  await expect(page.locator('.map-cluster-marker')).not.toHaveCount(0);
  await expect(page.locator('.map-cluster-marker').first()).toHaveAccessibleName(/Oct 2026/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect((await page.locator('.trip-map-stage').boundingBox())!.height).toBeGreaterThan(page.viewportSize()!.height / 2);
  expect(external).toEqual([]); expect(errors).toEqual([]); expect(failures).toEqual([]);
});

test('native map controls zoom, fit and keyboard pan; wheel still scrolls the page', async ({ page }) => {
  await ready(page);
  const camera = page.locator('.maplibregl-canvas');
  const start = await camera.getAttribute('data-camera');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(camera).not.toHaveAttribute('data-camera', start!);
  await page.getByRole('button', { name: 'Fit Taiwan' }).click();
  await expect(camera).toHaveAttribute('data-camera', start!);
  await camera.focus(); await page.keyboard.press('ArrowRight');
  await expect(camera).not.toHaveAttribute('data-camera', start!);
  await page.getByRole('button', { name: 'Fit Taiwan' }).click();
  await page.locator('.maplibregl-canvas').hover();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 350);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
});

test('one-finger touch over the standard map scrolls the page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4323' + trip);
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'maplibre');
  const box = (await page.locator('.maplibregl-canvas').boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 20 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50);
  await context.close();
});

test('standard popups show the actual photo date and open the native viewer', async ({ page }) => {
  await ready(page);
  await (await reveal(page, 'Jiufen')).click();
  const popup = page.locator('.maplibregl-popup');
  await expect(popup.getByRole('heading')).toHaveText('Jiufen');
  await expect(popup.locator('time')).toHaveText('20 Oct 2026');
  const link = popup.getByRole('link', { name: /^Open photo:/ });
  const [tab] = await Promise.all([page.context().waitForEvent('page'), link.click({ modifiers: ['ControlOrMeta'] })]);
  await expect(tab).toHaveURL(/jiufen-original\.webp$/); await tab.close();
  await link.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('time')).toHaveText('20 Oct 2026');
  await expect(dialog.getByRole('button', { name: 'close' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('heading')).toHaveText('Hualien area');
  await expect(dialog.locator('time')).toHaveText('17 Oct 2026');
  await dialog.getByRole('button', { name: 'next' }).click();
  await expect(dialog.getByRole('button', { name: 'next' })).toBeFocused();
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(audit.violations, JSON.stringify(audit.violations, null, 2)).toEqual([]);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(link).toBeFocused();
});

test('no JavaScript keeps the real map poster and dated native image links', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4323' + trip);
  await expect(page.locator('.map-poster')).toBeVisible();
  await expect.poll(() => page.locator('.map-poster').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(500);
  await page.getByText('Media and dates', { exact: true }).click();
  await expect(page.locator('.map-static-photos a')).toHaveCount(mediaCount);
  await expect(page.locator('.map-static-photos time')).not.toHaveCount(0);
  await page.locator('.map-static-photos a[href$="jiufen-original.webp"]').click();
  await expect(page).toHaveURL(/jiufen-original\.webp$/);
  await context.close();
});

test('missing basemap falls back to the existing-renderer poster, not custom geography', async ({ page }) => {
  await page.route('**/maps/taiwan.pmtiles', route => route.abort());
  await page.goto(trip);
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'fallback');
  await expect(page.locator('.map-poster')).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  await page.getByText('Media and dates', { exact: true }).click();
  await expect(page.locator('.map-static-photos a')).toHaveCount(mediaCount);
});

test('real WebGL context loss returns to the generic poster and native photo links', async ({ page }) => {
  await ready(page);
  expect(await page.locator('.maplibregl-canvas').evaluate(canvas => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext(); return true;
  })).toBe(true);
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'fallback');
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  await expect(page.locator('.map-poster')).toBeVisible();
});

test('unsupported dialog API preserves ordinary image navigation', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { value: undefined, configurable: true }); });
  await ready(page);
  await (await reveal(page, 'Jiufen')).click();
  await page.locator('.map-photo-popup a').click();
  await expect(page).toHaveURL(/jiufen-original\.webp$/);
});

test('reduced motion leaves reading and map/photo selection usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page);
  await (await reveal(page, 'Jiufen')).click();
  await expect(page.locator('.map-photo-popup time')).toHaveText('20 Oct 2026');
  await expect(page.locator('.trip-map')).not.toHaveCSS('position', 'sticky');
});

test('private export remains isolated and publication is refused', async () => {
  expect(existsSync('out')).toBe(false);
  expect(existsSync('.generated/travel-export/travels/taiwan.html')).toBe(true);
  const result = spawnSync('bun', ['scripts/assert-publishable.ts'], { encoding: 'utf8' });
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('Refusing to publish a private travel preview');
});

test('photo derivatives remain metadata-free', async ({ request }) => {
  for (const name of ['train', 'jiufen']) for (const width of [640, 1280, 1800]) {
    const response = await request.get(`/travels/preview/taiwan/${name}-${width}.webp`);
    const info = await sharp(await response.body()).metadata();
    expect(info.width).toBe(width); expect(info.exif).toBeUndefined(); expect(info.iptc).toBeUndefined(); expect(info.xmp).toBeUndefined();
  }
});

test('video is click-to-play, decodes real frames, and stops on close', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.mp4')) requests.push(request.url()); });
  await ready(page);
  const stopMarker = await reveal(page, 'Bawengweng Bikeway');
  const cameraReference = page.locator('.maplibregl-canvas');
  await stopMarker.click();
  await expect(cameraReference).toHaveAttribute('data-camera', /,160,0,0,0\]$/);
  const originalView = await cameraReference.getAttribute('data-camera');
  await expect(page.locator('.map-video-link')).toContainText('Play video · 2:54');
  expect(requests).toEqual([]);
  const link = page.getByRole('link', { name: /^Play video:/ });
  await link.click();
  const dialog = page.locator('.video-viewer'), video = dialog.locator('video');
  await expect(dialog).toBeVisible(); await expect(dialog.locator('time')).toHaveText('15 Oct 2026');
  await expect(video).toHaveAttribute('preload', 'none');
  expect(await video.evaluate(v => (v as HTMLVideoElement).autoplay)).toBe(false);
  expect(await video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  expect(requests).toEqual([]);
  await video.evaluate(element => { (element as HTMLVideoElement).muted = true; });
  await video.focus(); await page.keyboard.press('Space');
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0.3);
  expect(await video.evaluate(v => (v as HTMLVideoElement).getVideoPlaybackQuality().totalVideoFrames)).toBeGreaterThan(0);
  expect(await video.evaluate(v => (v as HTMLVideoElement).duration)).toBeGreaterThan(173);
  const handle = await video.elementHandle();
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  expect(await handle!.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  await expect(page.getByRole('button', { name: 'Explore Bawengweng Bikeway, 15 Oct 2026', exact: true })).toBeFocused();
  await expect(cameraReference).toHaveAttribute('data-camera', originalView!);
});

test('high-quality video preserves frame rate and strips embedded sensitive metadata', async () => {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', '.generated/travel-draft/media/coast-ride-hq.mp4'], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  const info = JSON.parse(result.stdout);
  expect(info.streams.map((s: { codec_type: string }) => s.codec_type)).toEqual(['video', 'audio']);
  const poster = await sharp('.generated/travel-draft/media/coast-ride-hq-poster.webp').metadata();
  expect(poster.exif).toBeUndefined(); expect(poster.iptc).toBeUndefined(); expect(poster.xmp).toBeUndefined();
  expect(info.streams[0].codec_name).toBe('h264');
  expect(Number(info.format.duration)).toBeGreaterThan(173);
  expect(info.streams[0].width).toBe(1920); expect(info.streams[0].height).toBe(1080);
  expect(info.streams[0].r_frame_rate).toBe('30000/1001');
  expect(Number(info.format.bit_rate)).toBeGreaterThan(10_000_000);
  expect(JSON.stringify([info.format.tags, ...info.streams.map((s: { tags: unknown }) => s.tags)])).not.toMatch(/location|creation_time|timecode|firmware|serial|gopro/i);
});

test('recorded GPS follows playback and seeking without moving the camera or requesting geolocation', async ({ page }) => {
  await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = () => { throw new Error('Current location must never be requested.'); }; navigator.geolocation.watchPosition = () => { throw new Error('Current location must never be requested.'); }; });
  await ready(page);
  await (await reveal(page, 'Bawengweng Bikeway')).click();
  await page.getByRole('link', { name: /^Play video:/ }).click();
  const marker = page.locator('.video-position-marker'), video = page.locator('video');
  const draft = JSON.parse(readFileSync('.generated/travel-draft/trips.json', 'utf8'));
  const track = draft[0].stops.find((s: { id: string }) => s.id === 'east-coast').videos[0].track;
  await expect(marker).toBeVisible();
  await expect.poll(async () => {
    const dot = (await marker.boundingBox())!, panel = (await page.locator('.video-viewer').boundingBox())!;
    return dot.y + dot.height <= panel.y || dot.x >= panel.x + panel.width;
  }).toBe(true);
  const first = await marker.getAttribute('data-latitude');
  const cameraReference = page.locator('.maplibregl-canvas');
  const before = await cameraReference.getAttribute('data-camera');
  await video.evaluate(async element => { const v = element as HTMLVideoElement; v.muted = true; await v.play(); v.pause(); v.currentTime = 90; });
  await expect.poll(async () => Number(await marker.getAttribute('data-latitude'))).toBeCloseTo(videoPosition(track, 90)![1], 6);
  await expect(marker).not.toHaveAttribute('data-latitude', first!);
  await expect(cameraReference).toHaveAttribute('data-camera', before!);
  const dot = (await marker.boundingBox())!, panel = (await page.locator('.video-viewer').boundingBox())!;
  expect(dot.y + dot.height <= panel.y || dot.x >= panel.x + panel.width).toBe(true);
  expect(await video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  await expect(page.locator('.video-position-status')).toHaveText('Recorded GPS · follows playback');
  await page.locator('.video-viewer').getByRole('button', { name: 'close' }).click();
  await expect(marker).toHaveCount(0);
});

test('every compatible clip decodes and full-resolution photos have no private metadata', async ({ page, request }) => {
  test.setTimeout(90_000);
  await ready(page);
  for (const stop of draft.stops) {
    for (const photo of stop.photos) {
      const response = await request.get(photo.original.src);
      expect(response.ok()).toBe(true);
      const metadata = await sharp(await response.body()).metadata();
      expect(metadata.width).toBe(photo.original.width);
      expect(metadata.height).toBe(photo.original.height);
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.iptc).toBeUndefined();
    }
    for (const clip of stop.videos ?? []) {
      await ready(page);
      await (await reveal(page, stop.place)).click();
      await page.getByRole('link', { name: /^Play video:/ }).click();
      const video = page.locator('video');
      await video.evaluate(async element => {
        const player = element as HTMLVideoElement;
        player.muted = true;
        await player.play();
      });
      await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).getVideoPlaybackQuality().totalVideoFrames)).toBeGreaterThan(0);
      await page.screenshot({ path: `.generated/travel-draft/verify/video-${clip.id}-${test.info().project.name}.png` });
      await page.locator('.video-viewer').getByRole('button', { name: 'close' }).click();
    }
  }
});

test('large private videos stream byte ranges and retain the same-origin privacy headers', async ({ request }) => {
  const response = await request.get('/travels/preview/taiwan/coast-ride-hq.mp4', { headers: { Range: 'bytes=0-1023' } });
  expect(response.status()).toBe(206); expect((await response.body()).length).toBe(1024);
  expect(response.headers()['content-range']).toMatch(/^bytes 0-1023\//);
  expect(response.headers()['permissions-policy']).toContain('geolocation=()');
  expect(response.headers()['x-robots-tag']).toContain('noindex');
  expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
  expect((await request.get('/', { headers: { Host: 'untrusted.example' } })).status()).toBe(403);
  expect((await request.get('/', { headers: { Origin: 'https://untrusted.example' } })).status()).toBe(403);
});

test('map and popup UI remain accessible and fit narrow screens', async ({ page }, info) => {
  test.setTimeout(90000);
  for (const path of ['/travels', trip]) {
    await page.goto(path);
    await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'maplibre');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'maplibre');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await (await reveal(page, 'Jiufen')).click();
      await expect.poll(async () => {
        const stage = (await page.locator('.trip-map-stage').boundingBox())!, popup = (await page.locator('.maplibregl-popup').boundingBox())!;
        return popup.x >= stage.x - 1 && popup.x + popup.width <= stage.x + stage.width + 1 && popup.y >= stage.y - 1 && popup.y + popup.height <= stage.y + stage.height + 1;
      }).toBe(true);
      await page.locator('.maplibregl-popup-close-button').click();
    }
    await page.setViewportSize(info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await (await reveal(page, 'Jiufen')).click();
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations, JSON.stringify(audit.violations, null, 2)).toEqual([]);
    if (path === trip) await page.screenshot({ path: `.generated/travel-draft/verify/map-only-${info.project.name}.jpg`, fullPage: true });
  }
});
