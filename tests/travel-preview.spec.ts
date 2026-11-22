import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { existsSync, readFileSync } from 'node:fs';
import { parseTrips, tripMedia, videoPosition } from '../lib/trips';
import { execFileSync, spawnSync } from 'node:child_process';

const trip = '/travels/taiwan';
const drafts = JSON.parse(readFileSync('.generated/travel-draft/trips.json', 'utf8'));
const draft = drafts[0];
const bali = parseTrips(drafts).find(item => item.id === 'bali');
const mediaCount = draft.stops.reduce((count: number, stop: { photos: unknown[]; videos?: unknown[] }) => count + stop.photos.length + (stop.videos?.length ?? 0), 0);
const card = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`.map-strip-card[data-media-id="${id}"]`);
const pin = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`.map-exact-pin[data-media-id="${id}"]`);
const openMedia = async (page: import('@playwright/test').Page, id: string) => {
  const item = card(page, id);
  await item.focus();
  if (await item.getAttribute('aria-pressed') !== 'true') await item.press('Enter');
  await item.press('Enter');
};
const ready = async (page: import('@playwright/test').Page) => {
  await page.goto(trip);
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'maplibre');
  await expect(page.locator('.maplibregl-canvas')).toHaveAttribute('data-camera', /^\[/);
};

test('maintained MapLibre component is the only travel surface and dates are visible', async ({ page }) => {
  const external: string[] = [], errors: string[] = [], failures: string[] = [];
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:4323') && !r.url().startsWith('data:')) external.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  await page.goto('/');
  await expect(page.locator('.trip-map, #travels')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Gallery' }).click();
  await expect(page.getByRole('heading', { name: 'gallery', exact: true })).toBeVisible();
  await page.locator('#travels .trip-cover[href="/travels/taiwan"]').click();
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'maplibre');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect(page.locator('.trip-pages, .trip-stop, .trip-masthead, .map-geography')).toHaveCount(0);
  await expect(page.locator('.map-caption > time')).toHaveText('Oct 2026');
  const fontPreload = page.locator('link[rel="preload"][as="font"]');
  await expect(fontPreload).toHaveCount(1);
  await expect(fontPreload).toHaveAttribute('href', '/fonts/allo/AlloVariable.woff2');
  const labels = ['.map-caption h1', '.map-caption > time', '.maplibregl-map', '.map-strip-card'];
  for (const selector of labels) {
    const family = await page.locator(selector).first().evaluate(element => {
      return getComputedStyle(element).fontFamily;
    });
    expect(family.split(',')[0]).toBe('Allo');
  }
  await expect(page.locator('.map-strip-card')).toHaveCount(mediaCount);
  await expect(page.locator('.map-cluster-marker, .map-stack-count, .map-card-stack, .map-card-leader')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect((await page.locator('.trip-map-stage').boundingBox())!.height).toBeGreaterThan(page.viewportSize()!.height / 2);
  expect(external).toEqual([]); expect(errors).toEqual([]); expect(failures).toEqual([]);
});

test('chronological polaroids fit a desktop row or a bounded swipe strip without cropped dates', async ({ page }) => {
  await ready(page);
  const cards = page.locator('.map-strip-card');
  await expect(cards).toHaveCount(mediaCount);
  await expect(page.locator('[data-overlapping="true"]')).toHaveCount(0);
  const stage = (await page.locator('.trip-map-stage').boundingBox())!;
  const stripFits = await page.locator('.map-media-strip').evaluate(element => element.scrollWidth <= element.clientWidth);
  const rectangles = await page.locator('.map-polaroid').evaluateAll(elements =>
    elements.map(element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    }));
  const controls = await page.locator('.map-caption, .map-fit, .maplibregl-ctrl-attrib').evaluateAll(elements =>
    elements.map(element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    }));
  for (const [index, rectangle] of rectangles.entries()) {
    if (stripFits) {
      expect(rectangle.left).toBeGreaterThanOrEqual(stage.x);
      expect(rectangle.right).toBeLessThanOrEqual(stage.x + stage.width);
    }
    expect(rectangle.top).toBeGreaterThanOrEqual(stage.y);
    expect(rectangle.bottom).toBeLessThanOrEqual(stage.y + stage.height);
    for (const other of [...rectangles.slice(index + 1), ...controls]) {
      const overlaps = rectangle.left < other.right && rectangle.right > other.left
        && rectangle.top < other.bottom && rectangle.bottom > other.top;
      expect(overlaps).toBe(false);
    }
  }
  const dates = await cards.locator('time').evaluateAll(elements => elements.map(element => element.getAttribute('datetime')));
  expect(dates).toEqual([...dates].sort());
  const stripBox = (await page.locator('.map-media-strip').boundingBox())!;
  expect(stripBox.x).toBeGreaterThanOrEqual(stage.x);
  expect(stripBox.x + stripBox.width).toBeLessThanOrEqual(stage.x + stage.width);
  for (const date of await cards.locator('time').all()) {
    await expect(date).toHaveText(/\d+ Oct 2026/);
    expect(await date.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  expect(await cards.first().locator('time').evaluate(element => getComputedStyle(element).fontVariantNumeric))
    .toBe('tabular-nums');
  if (!stripFits) {
    await cards.last().focus();
    await expect(cards.last()).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
});

test('each pin matches its original GPS exactly, not its stop; one zoom separates nearby pins', async ({ page }) => {
  test.setTimeout(90_000);
  const sources = JSON.parse(readFileSync('.generated/travel-draft/verify/polaroid/gps-sources.json', 'utf8'));
  const expected = new Map<string, number[]>();
  for (const [id, evidence] of Object.entries(sources) as [string, { source: string; gps: number[] }][]) {
    const telemetry = id === 'coast-ride';
    const args = telemetry ? ['-ee', '-G3', '-SampleTime'] : [];
    const record = JSON.parse(execFileSync('exiftool', [
      ...args, '-j', '-n', '-GPSLongitude', '-GPSLatitude', evidence.source,
    ], { maxBuffer: 16 * 1024 * 1024 }).toString())[0];
    const prefix = telemetry ? 'Doc1:' : '';
    const gps = [record[`${prefix}GPSLongitude`], record[`${prefix}GPSLatitude`]];
    expect(gps.every(Number.isFinite)).toBe(true);
    expect(evidence.gps).toEqual(gps);
    expected.set(id, gps);
  }
  await ready(page);
  await expect(page.locator('.map-exact-pin')).toHaveCount(mediaCount);
  for (const [id, gps] of expected) {
    const marker = pin(page, id);
    expect([Number(await marker.getAttribute('data-longitude')), Number(await marker.getAttribute('data-latitude'))])
      .toEqual(gps);
    await expect(card(page, id)).toBeVisible();
  }
  const distance = async () => {
    const first = (await pin(page, 'train').boundingBox())!;
    const second = (await pin(page, 'hualien-north').boundingBox())!;
    return Math.hypot(first.x - second.x, first.y - second.y);
  };
  const original = await distance();
  await card(page, 'train').focus();
  await card(page, 'train').press('Enter');
  await expect.poll(distance).toBeGreaterThan(original * 1.9);
  expect(await distance()).toBeGreaterThan(12);
  for (const [id, gps] of expected) {
    expect([Number(await pin(page, id).getAttribute('data-longitude')),
      Number(await pin(page, id).getAttribute('data-latitude'))]).toEqual(gps);
  }
});

test('strip and exact pins link both ways, keyboard steps and a second activation opens media', async ({ page }) => {
  await ready(page);
  const first = card(page, 'taipei-evening');
  await first.focus();
  await first.press('Enter');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(pin(page, 'taipei-evening')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await first.press('ArrowRight');
  await expect(card(page, 'lotus-pond')).toBeFocused();
  await expect(pin(page, 'lotus-pond')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Fit Taiwan' }).click();
  await pin(page, 'jiufen').click();
  await expect(card(page, 'jiufen')).toHaveAttribute('aria-pressed', 'true');
  const item = (await card(page, 'jiufen').boundingBox())!;
  const strip = (await page.locator('.map-media-strip').boundingBox())!;
  expect(item.x).toBeGreaterThanOrEqual(strip.x);
  expect(item.x + item.width).toBeLessThanOrEqual(strip.x + strip.width);
  await card(page, 'jiufen').press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('arrow keys navigate every photo and video in strip order in both directions', async ({ page }) => {
  await ready(page);
  const sequence = tripMedia(parseTrips([draft])[0]);
  const assertItem = async (index: number) => {
    const item = sequence[index];
    const panel = page.getByRole('dialog');
    await expect(panel).toBeVisible();
    const description = item.kind === 'photo' ? item.media.caption ?? item.media.alt : item.media.title;
    await expect(panel.locator('.media-description')).toBeVisible();
    await expect(panel.locator('.media-description')).toHaveText(description);
    await expect(panel.locator('.media-description')).toBeInViewport({ ratio: 1 });
    await expect(panel.getByRole('navigation', { name: 'Media navigation' })).toBeInViewport({ ratio: 1 });
    await expect(panel.locator('nav span')).toHaveText(`${index + 1} / ${sequence.length}`);
    await expect(panel.getByRole('button', { name: 'previous', exact: true })).toHaveJSProperty('disabled', index === 0);
    await expect(panel.getByRole('button', { name: 'next', exact: true })).toHaveJSProperty('disabled', index === sequence.length - 1);
    if (item.kind === 'video') {
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.trip-map-stage .video-viewer')).toHaveCount(0);
      await expect(panel.locator('video')).toHaveAttribute('aria-label', item.media.title);
      await expect(panel.locator('video')).toHaveJSProperty('paused', true);
      await expect(panel.locator('video')).toHaveAttribute('preload', 'none');
    } else {
      await expect(page.locator('video')).toHaveCount(0);
      await expect(panel.locator('figure img')).toHaveAttribute('alt', item.media.alt);
    }
  };
  await openMedia(page, sequence[0].id);
  const dialog = page.getByRole('dialog');
  const camera = page.locator('.maplibregl-canvas');
  const initialCamera = await camera.getAttribute('data-camera');
  await dialog.evaluate((element: HTMLDialogElement) => {
    element.dataset.closeCount = '0';
    element.addEventListener('close', () => {
      element.dataset.closeCount = String(Number(element.dataset.closeCount) + 1);
    });
  });
  await assertItem(0);
  for (let index = 1; index < sequence.length; index++) {
    await page.keyboard.press('ArrowRight');
    await assertItem(index);
  }
  for (let index = sequence.length - 2; index >= 0; index--) {
    await page.keyboard.press('ArrowLeft');
    await assertItem(index);
  }
  await expect(dialog).toHaveAttribute('data-close-count', '0');
  await expect(camera).toHaveAttribute('data-camera', initialCamera!);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(card(page, sequence[0].id)).toBeFocused();
});

test('media navigation stops outgoing video while native video arrows retain their controls', async ({ page }) => {
  await ready(page);
  await openMedia(page, 'coast-ride');
  const video = page.locator('video');
  await video.evaluate((element: HTMLVideoElement) => element.play());
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(.2);
  const outgoing = (await video.elementHandle())!;
  await video.focus();
  await page.keyboard.press('ArrowRight');
  const coast = tripMedia(parseTrips([draft])[0]).find(item => item.id === 'coast-ride')!;
  await expect(video).toHaveAttribute('aria-label', coast.kind === 'video' ? coast.media.title : '');
  await page.locator('.video-viewer').getByRole('button', { name: 'next', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  expect(await outgoing.evaluate((element: HTMLVideoElement) => element.paused && !element.isConnected)).toBe(true);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.video-viewer')).toBeVisible();
  await expect(page.locator('video')).toHaveJSProperty('currentTime', 0);
  await expect(page.locator('video')).toHaveJSProperty('paused', true);
});

test('playback failures offer the original file without choosing a reduced-quality fallback', async ({ page }) => {
  await ready(page);
  await openMedia(page, 'hualien-ride');
  const panel = page.locator('.video-viewer');
  const source = await panel.locator('video').getAttribute('src');
  await panel.locator('video').dispatchEvent('error');
  await expect(panel.locator('p[aria-live="polite"]')).toContainText('compatible player');
  await expect(panel.getByRole('link', { name: 'original', exact: true })).toHaveAttribute('href', /original.*\.mp4$/);
  await expect(panel.locator('video')).toHaveAttribute('src', source!);
});

test('swiping the native strip selects a card and its exact pin', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4323' + trip);
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'maplibre');
  const strip = page.locator('.map-media-strip');
  const box = (await strip.boundingBox())!;
  const session = await context.newCDPSession(page);
  const start = { x: box.x + box.width - 40, y: box.y + box.height / 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  for (let index = 1; index <= 8; index++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x - index * 25, y: start.y }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => strip.evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
  const selected = page.locator('.map-strip-card[aria-pressed="true"]');
  await expect(selected).toHaveCount(1);
  await expect(pin(page, (await selected.getAttribute('data-media-id'))!)).toHaveAttribute('aria-pressed', 'true');
  await context.close();
});

test('deliberate location changes animate, but reduced motion jumps directly', async ({ page }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion });
    await ready(page);
    const marker = pin(page, 'hualien-north');
    const camera = page.locator('.maplibregl-canvas');
    const before = await camera.getAttribute('data-camera');
    await marker.evaluate(element => {
      const target = element.parentElement!;
      const samples = new Set([target.style.transform]);
      target.dataset.cameraSamples = JSON.stringify([...samples]);
      new MutationObserver(() => {
        samples.add(target.style.transform);
        target.dataset.cameraSamples = JSON.stringify([...samples]);
      }).observe(target, { attributes: true, attributeFilter: ['style'] });
    });
    await card(page, 'hualien-north').focus();
    await card(page, 'hualien-north').press('Enter');
    await expect(camera).not.toHaveAttribute('data-camera', before!);
    await expect(camera).toHaveAttribute('data-camera-moving', 'false');
    const count = await marker.evaluate(element =>
      JSON.parse(element.parentElement!.dataset.cameraSamples!).length);
    if (reducedMotion === 'reduce') expect(count).toBeLessThanOrEqual(2);
    else expect(count).toBeGreaterThan(2);
    await expect(marker).toHaveAttribute('aria-pressed', 'true');
  }
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
  await page.locator('.maplibregl-canvas').hover({ position: { x: 10, y: 200 } });
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

test('individual photo cards show the actual date and open the native viewer', async ({ page }) => {
  await ready(page);
  const link = card(page, 'jiufen');
  await expect(link.locator('time')).toHaveText('20 Oct 2026');
  await openMedia(page, 'jiufen');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('time')).toHaveText('20 Oct 2026');
  await expect(dialog.getByRole('button', { name: 'close' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText('Hualien area');
  await expect(dialog.locator('time')).toHaveText('17 Oct 2026');
  await expect(dialog.locator('video')).toBeVisible();
  await dialog.getByRole('button', { name: 'next', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'next' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'close' })).toBeFocused();
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
  await openMedia(page, 'jiufen');
  await expect(page).toHaveURL(/jiufen-original\.webp$/);
});

test('reduced motion leaves reading and map/photo selection usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page);
  await openMedia(page, 'jiufen');
  await expect(page.locator('.photo-viewer time')).toHaveText('20 Oct 2026');
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
  const cameraReference = page.locator('.maplibregl-canvas');
  expect(requests).toEqual([]);
  await card(page, 'coast-ride').focus();
  await card(page, 'coast-ride').press('Enter');
  await expect(cameraReference).toHaveAttribute('data-camera-moving', 'false');
  const originalView = await cameraReference.getAttribute('data-camera');
  await openMedia(page, 'coast-ride');
  const dialog = page.locator('.video-viewer'), video = dialog.locator('video');
  await expect(dialog).toBeVisible(); await expect(dialog.locator('time')).toHaveText('15 Oct 2026');
  await expect(dialog.locator('.media-description')).toHaveText('A coastal road with palm trees, mountains and the sea in Taiwan.');
  await expect(video).toHaveAttribute('data-player', 'react-player');
  await expect(video).toHaveAttribute('poster', /\.webp$/);
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
  await expect(card(page, 'coast-ride')).toBeFocused();
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
  await openMedia(page, 'coast-ride');
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
  await expect(page.locator('.video-position-status')).toHaveText('GPS');
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
      await openMedia(page, clip.id);
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

test('map and individual media UI remain accessible and fit narrow screens', async ({ page }, info) => {
  test.setTimeout(90000);
  for (const path of ['/travels', trip]) {
    await page.goto(path);
    const taiwan = page.getByRole('region', { name: 'Taiwan travel map', exact: true });
    await expect(taiwan).toHaveAttribute('data-renderer', 'maplibre');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(taiwan).toHaveAttribute('data-renderer', 'maplibre');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(taiwan.locator('.map-strip-card')).toHaveCount(mediaCount);
      await expect(taiwan.locator('[data-overlapping="true"]')).toHaveCount(0);
      const stage = (await taiwan.locator('.trip-map-stage').boundingBox())!;
      for (const item of await taiwan.locator('.map-polaroid').all()) {
        const rectangle = (await item.boundingBox())!;
        if (stage.width >= 1050) {
          expect(rectangle.x).toBeGreaterThanOrEqual(stage.x);
          expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(stage.x + stage.width);
        }
        expect(rectangle.y).toBeGreaterThanOrEqual(stage.y);
        expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(stage.y + stage.height);
      }
    }
    await page.setViewportSize(info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await openMedia(page, 'jiufen');
    const audit = await new AxeBuilder({ page }).include('.trip-map[aria-label="Taiwan travel map"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations, JSON.stringify(audit.violations, null, 2)).toEqual([]);
    if (path === trip) await page.screenshot({ path: `.generated/travel-draft/verify/map-only-${info.project.name}.jpg`, fullPage: true });
  }
});

test.describe('private Bali gallery', () => {
  test.skip(!bali, 'No local Bali draft is staged.');

  test('Bali uses its regional library basemap and only the approved recorded pin', async ({ page }) => {
    await page.goto('/travels/bali');
    const region = page.getByRole('region', { name: 'Bali travel map', exact: true });
    await expect(region).toHaveAttribute('data-renderer', 'maplibre');
    await expect(region.locator('.maplibregl-canvas')).toBeVisible();
    await expect(region.getByRole('button', { name: 'Fit Bali', exact: true })).toBeVisible();
    await expect(region.getByRole('button', { name: 'Fit Taiwan', exact: true })).toHaveCount(0);
    await expect(region.locator('.map-strip-card')).toHaveCount(2);
    expect(await region.locator('.map-strip-card').evaluateAll(elements => elements.map(item => item.getAttribute('data-media-id'))))
      .toEqual(['bali-mountain', 'bali-temple']);
    await expect(card(page, 'bali-mountain').locator('time')).toHaveAttribute('datetime', '2026-05-27');
    await expect(card(page, 'bali-mountain').locator('time')).toHaveText('27 May 2026');
    await expect(card(page, 'bali-temple').locator('time')).toHaveAttribute('datetime', '2026-05-30');
    await expect(card(page, 'bali-temple').locator('time')).toHaveText('30 May 2026');
    await expect(region.locator('.map-exact-pin')).toHaveCount(1);
    const temple = tripMedia(bali!).find(item => item.id === 'bali-temple')!;
    expect(temple.gps).toBeDefined();
    const marker = pin(page, 'bali-temple');
    expect([Number(await marker.getAttribute('data-longitude')), Number(await marker.getAttribute('data-latitude'))])
      .toEqual(temple.gps);
    expect(tripMedia(bali!).find(item => item.id === 'bali-mountain')!.gps).toBeUndefined();
    await expect(pin(page, 'bali-mountain')).toHaveCount(0);
    await expect(card(page, 'bali-mountain')).toBeVisible();
    await expect(card(page, 'bali-mountain')).toHaveAttribute('aria-pressed', 'false');
    await expect(card(page, 'bali-mountain')).toHaveAttribute('aria-label', /Select \(no recorded GPS\)/);
    await expect(region.locator('.map-poster')).toHaveAttribute('src', '/maps/bali-overview.webp');
    await expect(region.locator('.map-poster')).toHaveAttribute('alt', /Bali/);
  });

  test('Bali native popup shows verified place, date and the exact recorded location without camera drift', async ({ page }) => {
    await page.goto('/travels/bali');
    const region = page.getByRole('region', { name: 'Bali travel map', exact: true });
    await expect(region).toHaveAttribute('data-renderer', 'maplibre');
    await pin(page, 'bali-temple').click();
    const popup = region.locator('.maplibregl-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('strong')).toHaveText('Pura Penataran Agung Lempuyang');
    await expect(popup.locator('time')).toHaveAttribute('datetime', '2026-05-30');
    await expect(popup.locator('time')).toHaveText('30 May 2026');
    await expect(popup).not.toContainText('Recorded photo GPS');
    await expect(popup.getByRole('link')).toHaveCount(0);
    const camera = region.locator('.maplibregl-canvas');
    await expect(camera).toHaveAttribute('data-camera-moving', 'false');
    const before = await camera.getAttribute('data-camera');
    await card(page, 'bali-temple').focus();
    await expect(card(page, 'bali-temple')).toBeFocused();
    await popup.getByRole('button', { name: 'Close popup', exact: true }).click();
    await expect(popup).toHaveCount(0);
    await expect(pin(page, 'bali-temple')).toHaveAttribute('aria-pressed', 'false');
    await expect(camera).toHaveAttribute('data-camera', before!);
    await pin(page, 'bali-temple').click();
    await expect(popup).toBeVisible();
    await expect(camera).toHaveAttribute('data-camera', before!);
  });

  test('Bali full-resolution crops and every preview are sanitized without upscaling', async ({ request }) => {
    for (const [id, width, height] of [
      ['bali-temple', 3024, 3650], ['bali-mountain', 1080, 1700],
    ] as const) {
      for (const size of ['640', '1280', '1800', 'original']) {
        const response = await request.get(`/travels/preview/bali/${id}-${size}.webp`);
        expect(response.ok()).toBe(true);
        const metadata = await sharp(await response.body()).metadata();
        expect(metadata.width).toBe(size === 'original' ? width : Math.min(Number(size), width));
        if (size === 'original') expect(metadata.height).toBe(height);
        expect(metadata.exif).toBeUndefined();
        expect(metadata.iptc).toBeUndefined();
        expect(metadata.xmp).toBeUndefined();
      }
    }
  });

  test('Bali photo navigation stays in the same modal without moving the underlying camera', async ({ page }) => {
    await page.goto('/travels/bali');
    const region = page.getByRole('region', { name: 'Bali travel map', exact: true });
    await expect(region).toHaveAttribute('data-renderer', 'maplibre');
    await card(page, 'bali-mountain').focus();
    await card(page, 'bali-mountain').press('Enter');
    const camera = region.locator('.maplibregl-canvas');
    await expect(camera).toHaveAttribute('data-camera-moving', 'false');
    await expect(camera).toHaveAttribute('data-camera', /^\[/);
    const initialCamera = await camera.getAttribute('data-camera');
    await openMedia(page, 'bali-mountain');
    const dialog = region.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.evaluate((element: HTMLDialogElement) => {
      element.dataset.closeCount = '0';
      element.addEventListener('close', () => {
        element.dataset.closeCount = String(Number(element.dataset.closeCount) + 1);
      });
    });
    await expect(dialog.locator('figure img')).toHaveAttribute('src', /bali-mountain-original.webp$/);
    await expect(dialog.locator('header time')).toHaveText('27 May 2026');
    await page.keyboard.press('ArrowRight');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('figure img')).toHaveAttribute('src', /bali-temple-original.webp$/);
    await expect(dialog.locator('header time')).toHaveText('30 May 2026');
    await expect(region.locator('.maplibregl-popup')).toHaveCount(0);
    await expect(dialog.locator('nav span')).toHaveText('2 / 2');
    await page.keyboard.press('ArrowLeft');
    await expect(dialog.locator('figure img')).toHaveAttribute('src', /bali-mountain-original.webp$/);
    await expect(dialog).toHaveAttribute('data-close-count', '0');
    await expect(camera).toHaveAttribute('data-camera', initialCamera!);
    await expect(region.locator('.video-viewer')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(card(page, 'bali-mountain')).toBeFocused();
    await expect(camera).toHaveAttribute('data-camera', initialCamera!);
  });

  test('Taiwan and Bali coexist on the index with separate archive fetches and cache keys', async ({ page }) => {
    const archives: string[] = [];
    const errors: string[] = [];
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (path.endsWith('.pmtiles')) archives.push(path);
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/travels');
    const taiwan = page.getByRole('region', { name: 'Taiwan travel map', exact: true });
    const region = page.getByRole('region', { name: 'Bali travel map', exact: true });
    await expect(page.locator('#travels .trip-cover[href="/travels/taiwan"]')).toBeVisible();
    await taiwan.scrollIntoViewIfNeeded();
    await expect(taiwan).toHaveAttribute('data-renderer', 'maplibre');
    await region.scrollIntoViewIfNeeded();
    await expect(region).toHaveAttribute('data-renderer', 'maplibre');
    await expect(page.locator('#travels .trip-cover[href="/travels/bali"]')).toBeVisible();
    await expect(region.getByRole('button', { name: 'Fit Bali', exact: true })).toBeVisible();
    await expect(region.locator('.map-strip-card')).toHaveCount(2);
    await expect(region.locator('.map-exact-pin')).toHaveCount(1);
    await expect(taiwan.locator('.map-strip-card')).toHaveCount(mediaCount);
    await expect(taiwan.getByRole('button', { name: 'Fit Taiwan', exact: true })).toBeAttached();
    expect(archives).toContain('/maps/taiwan.pmtiles');
    expect(archives).toContain('/maps/bali.pmtiles');
    await region.getByRole('button', { name: 'Fit Bali', exact: true }).click();
    await taiwan.scrollIntoViewIfNeeded();
    await taiwan.getByRole('button', { name: 'Fit Taiwan', exact: true }).click();
    await expect(taiwan).toHaveAttribute('data-renderer', 'maplibre');
    await expect(region).toHaveAttribute('data-renderer', 'maplibre');
    expect(errors).toEqual([]);
  });

  test('Bali fits narrow and desktop screens with accessible photo navigation', async ({ page }, info) => {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/travels/bali');
      const region = page.getByRole('region', { name: 'Bali travel map', exact: true });
      await expect(region).toHaveAttribute('data-renderer', 'maplibre');
      await expect(region.locator('.map-strip-card')).toHaveCount(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await openMedia(page, 'bali-temple');
      await expect(region.getByRole('dialog')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(region.getByRole('dialog').getByRole('navigation', { name: 'Media navigation' }))
        .toBeInViewport({ ratio: 1 });
      await page.keyboard.press('Escape');
    }
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations, JSON.stringify(audit.violations, null, 2)).toEqual([]);
    await page.screenshot({ path: `.generated/travel-draft/verify/bali-${info.project.name}.jpg`, fullPage: true });
  });
});
