import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import projects from '../data/projects.json' with { type: 'json' };
import links from '../data/links.json' with { type: 'json' };
import tripsData from '../data/trips.json' with { type: 'json' };
import { parseTrips, tripMedia } from '../lib/trips';

const approvedTrips = parseTrips(tripsData);

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('.garden-main')).toHaveAttribute('data-state', /live|still/);
}
const fixture = () => readFileSync(new URL('../.generated/travel-fixture.html', import.meta.url), 'utf8');
async function diaryFixture(page: Page) {
  await page.route('**/travels/fixture-*', route => route.fulfill({ path: 'public/garden-fallback.png', contentType: 'image/png' }));
  // Exercise the legacy fallback alone, never beside the approved map gallery.
  await expect(page.locator('.travel-entry')).toHaveCount(0);
  await page.locator('.trip-gallery').evaluateAll(elements => elements.forEach(element => element.remove()));
  await page.locator('#notes').evaluate((section, html) => { section.insertAdjacentHTML('beforebegin', html); }, fixture());
}

async function approvedFallback(page: Page) {
  if (!approvedTrips.length) return;
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Gallery' }).click();
  await expect(page).toHaveURL(/\/travels$/);
  await expect(page.locator('.trip-map')).toHaveCount(approvedTrips.length);
  for (const trip of approvedTrips) {
    const map = page.getByRole('region', { name: `${trip.title} travel map`, exact: true });
    await expect(map.locator('.map-poster')).toBeVisible();
    await expect
      .poll(() => map.locator('.map-poster').evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    await map.locator('summary').click();
    const media = tripMedia(trip);
    await expect(map.locator('.map-static-photos a')).toHaveCount(media.length);
    for (const item of media) {
      const link = map.locator(`.map-static-photos a[href="${item.media.original?.src ?? item.media.src}"]`);
      await expect(link).toBeVisible();
      await expect(link).toContainText(item.place);
      await expect(link.locator('time')).toHaveAttribute('datetime', item.date);
    }
  }
  await page.getByRole('link', { name: 'back home', exact: true }).click();
}

test('no selectors, less copy, original links and light mode without external requests', async ({ page }) => {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4322') external.push(request.url()); });
  await page.emulateMedia({ colorScheme: 'dark' });
  await ready(page);
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).colorScheme)).toBe('light');
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.locator('.site-brand')).toHaveText('akshat.dev');
  await expect(page.locator('.site-brand > *')).toHaveCount(0);
  await expect(page.locator('.link-arrow, .brand-seed')).toHaveCount(0);
  expect((await page.locator('a').allTextContents()).some(text => /[↗←]/.test(text))).toBe(false);
  for (const project of projects) await expect(page.locator(`#projects a[href="${project.url}"]`)).toHaveCount(1);
  await expect(page.locator('#notes li')).toHaveCount(2);
  await expect(page.locator('#links li')).toHaveCount(16);
  await expect(page.locator('.reading-list a:visible')).toHaveCount(6);
  expect((await page.locator('main').innerText()).split(/\s+/).length).toBeLessThan(210);
  await expect(page.locator('#notes')).toContainText('agent notes — not for human eyes');
  await expect(page.locator('#travels, .trip-gallery, .trip-map, .maplibregl-canvas')).toHaveCount(0);
  const gallery = page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Gallery' });
  await expect(gallery).toHaveCount(approvedTrips.length ? 1 : 0);
  if (approvedTrips.length) await expect(gallery).toHaveAttribute('href', '/travels');
  await expect(page.locator('.travel-entry')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('Gallery navigation works by keyboard and keeps trips off the homepage', async ({ page }) => {
  test.skip(!approvedTrips.length, 'No approved gallery to navigate.');
  await ready(page);
  const gallery = page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Gallery' });
  const typography = (element: Element) => {
    const style = getComputedStyle(element);
    return { size: style.fontSize, family: style.fontFamily, weight: style.fontWeight };
  };
  const brandTypography = await page.locator('.site-brand').evaluate(typography);
  expect(await gallery.evaluate(typography)).toEqual(brandTypography);
  expect(brandTypography.size).toBe('12px');
  await gallery.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/travels$/);
  await expect(page.getByRole('heading', { name: 'gallery', exact: true })).toBeVisible();
  for (const trip of approvedTrips) {
    await expect(page.locator(`.trip-cover[href="/travels/${trip.id}"]`)).toHaveText(trip.title);
  }
  await page.locator('.trip-cover').first().click();
  await expect(page).toHaveURL(`/travels/${approvedTrips[0].id}`);
  await expect(page.getByRole('region', { name: `${approvedTrips[0].title} travel map`, exact: true })).toBeVisible();
});

test('Taiwan previews honor selected captions, the bridge label and the repair-photo crop', async ({ page }) => {
  const taiwan = approvedTrips.find(trip => trip.id === 'taiwan');
  test.skip(!taiwan, 'No approved Taiwan trip.');
  const items = tripMedia(taiwan!);
  await page.goto('/travels/taiwan');
  const region = page.getByRole('region', { name: 'Taiwan travel map', exact: true });
  await expect(region.locator('.map-strip-card')).toHaveCount(items.length);
  const first = region.locator(`.map-strip-card[data-media-id="${items[0].id}"]`);
  await first.focus();
  await first.press('Enter');
  await first.press('Enter');
  const dialog = page.getByRole('dialog');
  for (const [index, item] of items.entries()) {
    if (index) await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('heading')).toHaveText(item.place);
    const caption = item.media.caption;
    const description = dialog.locator('.media-description');
    if (caption === null) {
      await expect(description).toHaveCount(0);
    } else {
      const fallback = item.kind === 'photo' ? item.media.alt : item.media.title;
      await expect(description).toHaveText(caption ?? fallback);
    }
    if (item.id === 'coast-photo') {
      await expect.poll(() => dialog.locator('img').evaluate((image: HTMLImageElement) =>
        [image.naturalWidth, image.naturalHeight])).toEqual([4454, 4176]);
      await expect(description).toBeInViewport({ ratio: 1 });
      await expect(dialog.getByRole('navigation')).toBeInViewport({ ratio: 1 });
    }
    if (item.id === 'hualien-ride') {
      await expect(dialog.getByRole('heading')).toHaveText('Guosheng Bridge');
    }
  }
});

test('published Bali keeps exact dates, reviewed framing and only the recorded temple pin', async ({ page }) => {
  const bali = approvedTrips.find(trip => trip.id === 'bali');
  test.skip(!bali, 'No approved Bali trip.');
  const items = tripMedia(bali!);
  const temple = items.find(item => item.id === 'bali-temple')!;
  const mountain = items.find(item => item.id === 'bali-mountain')!;
  expect(temple.date).toBe('2026-05-30');
  expect(mountain.date).toBe('2026-05-27');
  expect(temple.place).toBe('Pura Penataran Agung Lempuyang');
  expect(temple.gps).toBeDefined();
  expect(mountain.gps).toBeUndefined();

  await page.goto('/travels/bali');
  const region = page.getByRole('region', { name: 'Bali travel map', exact: true });
  await expect(region).toHaveAttribute('data-renderer', 'maplibre', { timeout: 15_000 });
  await expect(region.locator('.map-strip-card')).toHaveCount(2);
  for (const item of items) {
    const card = region.locator(`.map-strip-card[data-media-id="${item.id}"]`);
    await expect(card.locator('time')).toHaveAttribute('datetime', item.date);
    await expect(card.locator('time')).toHaveText(item.id === temple.id ? '30 May 2026' : '27 May 2026');
  }

  await expect(region.locator('.map-exact-pin')).toHaveCount(1);
  const marker = region.locator(`.map-exact-pin[data-media-id="${temple.id}"]`);
  expect([Number(await marker.getAttribute('data-longitude')), Number(await marker.getAttribute('data-latitude'))])
    .toEqual(temple.gps);
  await marker.click();
  const popup = region.locator('.maplibregl-popup');
  await expect(popup.locator('strong')).toHaveText(temple.place);
  await expect(popup).not.toContainText('Recorded photo GPS');
  await expect(popup.getByRole('link')).toHaveCount(0);
  await popup.getByRole('button', { name: 'Close popup', exact: true }).click();

  const mountainCard = region.locator(`.map-strip-card[data-media-id="${mountain.id}"]`);
  await mountainCard.focus();
  if (await mountainCard.getAttribute('aria-pressed') !== 'true') await mountainCard.press('Enter');
  await mountainCard.press('Enter');
  const dialog = region.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toHaveAttribute('alt', /laptop screen.*coffee/i);
});

test('published regional photo popups contain only the place and date', async ({ page }) => {
  test.setTimeout(60_000);
  for (const id of ['bali', 'siquijor', 'amritsar']) {
    const trip = approvedTrips.find(item => item.id === id)!;
    const item = tripMedia(trip).find(media => media.gps)!;
    await page.goto(`/travels/${id}`);
    const region = page.getByRole('region', { name: `${trip.title} travel map`, exact: true });
    await expect(region).toHaveAttribute('data-renderer', 'maplibre', { timeout: 15_000 });
    await region.locator(`.map-exact-pin[data-media-id="${item.id}"]`).click();
    const details = region.locator('.map-location-details');
    await expect(details.locator(':scope > *')).toHaveCount(2);
    await expect(details.locator('strong')).toHaveText(item.place);
    await expect(details.locator('time')).toHaveAttribute('datetime', item.date);
    if (id === 'amritsar') {
      expect(item.date).toBe('2026-06-05');
      expect(item.place).toBe('Golden Temple');
      expect(item.media.original).toMatchObject({ width: 3024, height: 4032 });
      await expect(region.locator('.map-exact-pin')).toHaveCount(1);
      await expect(region.locator('.map-strip-card')).toHaveCount(1);
    }
    await expect(details.getByRole('link')).toHaveCount(0);
    await expect(details).not.toContainText('Recorded photo GPS');
  }
});

test('gallery maps align with the shared site column at every screen width', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/travels', '/travels/taiwan']) {
      await page.goto(route);
      const header = (await page.locator('.site-header').boundingBox())!;
      await expect(page.locator('.trip-map')).toHaveCount(route === '/travels' ? approvedTrips.length : 1);
      for (const mapElement of await page.locator('.trip-map').all()) {
        const map = (await mapElement.boundingBox())!;
        expect(map.x).toBeCloseTo(header.x, 0);
        expect(map.width).toBeCloseTo(header.width, 0);
        expect(map.width).toBeLessThanOrEqual(640);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
});

test('media navigation stays visible in a short landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto('/travels/taiwan');
  const first = page.locator('.map-strip-card[data-media-id="taipei-evening"]');
  await first.focus();
  await first.press('Enter');
  await first.press('Enter');
  const dialog = page.getByRole('dialog');
  for (let index = 0; index < 9; index++) {
    if (index) await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('navigation')).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole('button', { name: 'close', exact: true })).toBeInViewport({ ratio: 1 });
  }
});

test('dialog gutters do not dismiss media, but the backdrop does', async ({ page }) => {
  await page.goto('/travels/taiwan');
  const first = page.locator('.map-strip-card[data-media-id="taipei-evening"]');
  await first.focus();
  await first.press('Enter');
  await first.press('Enter');
  const dialog = page.getByRole('dialog');
  const box = (await dialog.boundingBox())!;
  await page.mouse.click(box.x + 4, box.y + 40);
  await expect(dialog).toBeVisible();
  await page.mouse.click(box.x - 5, box.y + 40);
  await expect(dialog).not.toBeVisible();
  await expect(first).toBeFocused();
});

test('Allo is self-hosted, variable, licensed and the only preloaded font', async ({ page, request }) => {
  const fontPath = '/fonts/allo/AlloVariable.woff2';
  const packageFont = readFileSync('node_modules/allo-font/fonts/webfonts/AlloVariable.woff2');
  const response = await request.get(fontPath);
  expect(response.ok()).toBe(true);
  expect(await response.body()).toEqual(packageFont);
  const oblique = await request.get('/fonts/allo/Allo-Oblique.woff2');
  expect(await oblique.body()).toEqual(readFileSync('node_modules/allo-font/fonts/webfonts/Allo-Oblique.woff2'));
  const license = await request.get('/licenses/allo.txt');
  expect(await license.text()).toBe(readFileSync('node_modules/allo-font/OFL.txt', 'utf8'));

  for (const path of ['/', '/tv', '/qin']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const preload = page.locator('link[rel="preload"][as="font"]');
    await expect(preload).toHaveCount(1);
    await expect(preload).toHaveAttribute('href', fontPath);
    await expect(preload).toHaveAttribute('crossorigin', /^(anonymous)?$/);
    const typography = await page.locator('body').evaluate(element => {
      const style = getComputedStyle(element);
      const font = [...document.fonts].find(face => face.family === 'Allo' && face.style === 'normal');
      if (!font) throw new Error('Allo is absent from document.fonts.');
      return {
        family: style.fontFamily, variations: style.fontVariationSettings,
        opticalSizing: style.fontOpticalSizing,
        weight: font.weight, display: font.display, status: font.status,
      };
    });
    expect(typography.family).toBe('Allo, "DM Sans Variable", system-ui, sans-serif');
    expect(typography.variations).toBe('"ROND" 45');
    expect(typography.opticalSizing).toBe('auto');
    expect(typography.weight).toBe('100 900');
    expect(typography.display).toBe('swap');
    expect(typography.status).toBe('loaded');
    const display = await page.locator('h1').evaluate(element => {
      const style = getComputedStyle(element);
      return { weight: style.fontWeight, variations: style.fontVariationSettings };
    });
    expect(display.weight).toBe('580');
    expect(display.variations).toContain('"opsz" 32');
    expect(display.variations).toContain('"ROND" 70');
    expect(await page.locator('.site-footer').evaluate(element => getComputedStyle(element).fontStyle)).toBe('italic');
  }
});

test('old theme preferences have no effect on home or notes', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('akshat.environment.v1', 'circuit'); localStorage.setItem('akshat.appearance.v1', 'dark'); });
  await ready(page);
  await expect(page.locator('html')).not.toHaveAttribute('data-environment');
  for (const route of ['/tv', '/qin']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
    await expect(page.getByRole('button')).toHaveCount(0);
    await expect(page.locator('aside')).toContainText('agent notes — not for human eyes');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://akshat.dev${route}`);
  }
});

test('blocked storage leaves the site usable', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }); });
  await ready(page);
  await page.locator('#links summary').click();
  await expect(page.locator(`#links a[href="${links.at(-1)!.url}"]`)).toBeVisible();
});

test('no JavaScript retains flowers, the reading disclosure and complete notes', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.locator('.garden-main .garden-fallback')).toBeVisible();
  expect(await page.locator('.garden-main img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await page.locator('#links summary').click();
  await expect(page.locator(`#links a[href="${links.at(-1)!.url}"]`)).toBeVisible();
  await approvedFallback(page);
  await expect(page.locator('.roadside-scene')).toHaveCount(0);
  await diaryFixture(page);
  await expect(page.getByRole('heading', { name: 'Coast page' })).toBeVisible();
  await expect(page.locator('.diary-note').first()).toBeVisible();
  for (const route of ['/tv', '/qin']) {
    await page.goto(route);
    expect((await page.locator('article').innerText()).length).toBeGreaterThan(5000);
    await expect(page.locator('aside')).toContainText('agent notes — not for human eyes');
  }
  await context.close();
});

test('links and native reading disclosure work by keyboard', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.locator('#links summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#links details')).toHaveAttribute('open', '');
  await page.keyboard.press('Tab');
  await expect(page.locator('#links details a').first()).toBeFocused();
});

test('Seedbed flowers bloom in many colors and sleep after leaving', async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: unknown[]) {
      this.canvas.dataset.draws = String(Number(this.canvas.dataset.draws || 0) + 1);
      return Reflect.apply(original, this, args);
    };
  });
  await ready(page);
  const canvas = page.locator('.garden-main canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * .65);
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => {
    const pixels = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
    const buckets = new Set<number>();
    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 45 && Math.max(r, g, b) > 150) buckets.add((Math.round(r / 24) << 8) + (Math.round(g / 24) << 4) + Math.round(b / 24));
    }
    return buckets.size;
  })).toBeGreaterThan(5);
  const before = Number(await canvas.getAttribute('data-draws'));
  await page.waitForTimeout(200);
  expect(Number(await canvas.getAttribute('data-draws'))).toBeGreaterThan(before + 3);
  await page.mouse.move(0, 0);
  await expect.poll(async () => {
    const draws = await canvas.getAttribute('data-draws');
    await page.waitForTimeout(250);
    return await canvas.getAttribute('data-draws') === draws;
  }, { timeout: 10_000 }).toBe(true);
  const settled = await canvas.getAttribute('data-draws');
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute('data-draws')).toBe(settled);
});

test('touch retains native scrolling', async ({ page }) => {
  await ready(page);
  expect(await page.locator('.garden-main canvas').evaluate(el => getComputedStyle(el).touchAction)).toBe('pan-y');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const box = (await page.locator('.garden-main').boundingBox())!;
  const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + 120);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 8; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 20, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  } finally { await session.detach(); }
});

test('live reduced motion keeps colorful static flowers', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.garden-main .garden-fallback')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.garden-main canvas')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Canvas failure retains flowers and navigation', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null }); });
  await ready(page);
  await expect(page.locator('.garden-main .garden-fallback')).toBeVisible();
  await expect(page.locator('#notes a').first()).toBeVisible();
  await approvedFallback(page);
});

test('bicycle follows native scrolling, reverses, and becomes still for reduced motion', async ({ page }) => {
  await ready(page);
  await diaryFixture(page);
  expect(await page.evaluate(() => CSS.supports('animation-timeline', 'view()'))).toBe(true);
  const bike = page.locator('.road-bicycle');
  const distance = () => bike.evaluate(el => parseFloat(getComputedStyle(el).offsetDistance));
  const before = await distance();
  await page.locator('#travels').evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + 100));
  await expect.poll(distance).toBeGreaterThan(before + 20);
  const roadBox = (await page.locator('.roadside-drawing').boundingBox())!;
  const bikeBox = (await bike.boundingBox())!;
  expect(bikeBox.x).toBeGreaterThan(roadBox.x - 30);
  expect(bikeBox.x).toBeLessThan(roadBox.x + roadBox.width + 30);
  expect(bikeBox.y).toBeGreaterThan(roadBox.y - 40);
  expect(bikeBox.y).toBeLessThan(roadBox.y + roadBox.height + 40);
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(distance).toBeLessThan(before + 10);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await bike.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test('a long diary pins the landscape while normal scrolling advances the bicycle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  await diaryFixture(page);
  await page.locator('.diary-note').first().evaluate(el => { el.textContent = (el.textContent + '\n\n').repeat(16); });
  const top = await page.locator('#travels').evaluate(el => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(y => scrollTo(0, y), top + 160);
  const scene = page.locator('.roadside-scene');
  await expect.poll(async () => Math.abs((await scene.boundingBox())!.y)).toBeLessThan(2);
  const before = await page.locator('.road-bicycle').evaluate(el => parseFloat(getComputedStyle(el).offsetDistance));
  const proseY = (await page.locator('.diary-content').first().boundingBox())!.y;
  await page.evaluate(() => scrollBy(0, 180));
  await expect.poll(() => page.locator('.road-bicycle').evaluate(el => parseFloat(getComputedStyle(el).offsetDistance))).toBeGreaterThan(before + 1);
  expect(Math.abs((await scene.boundingBox())!.y)).toBeLessThan(2);
  expect((await page.locator('.diary-content').first().boundingBox())!.y).toBeLessThan(proseY - 150);
  const photos = page.getByRole('region', { name: 'Photos from Coast page' });
  await photos.focus();
  const photoBox = (await photos.boundingBox())!;
  const sceneBox = (await scene.boundingBox())!;
  expect(photoBox.y).toBeGreaterThanOrEqual(sceneBox.y + sceneBox.height - 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await scene.evaluate(el => getComputedStyle(el).position)).toBe('relative');
});

test('diary fixture has visible prose, native photo scrolling and no invented live stops', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await expect(page.locator('.travel-entry')).toHaveCount(0);
  await diaryFixture(page);
  await expect(page.locator('.travel-entry')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Coast page' })).toBeVisible();
  await expect(page.locator('.diary-note').first()).toBeVisible();
  await expect(page.locator('#travels details')).toHaveCount(0);
  const photos = page.getByRole('region', { name: 'Photos from Coast page' });
  await photos.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => photos.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  await page.setViewportSize(testInfo.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  await photos.evaluate(el => (el as HTMLElement).blur());
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `test-results/diary-fixture-${testInfo.project.name}.jpg`, fullPage: true });
});

test('built assets preserve redirects, metadata, headers and real 404s', async ({ request }) => {
  const home = await request.get('/');
  expect(home.status()).toBe(200);
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(home.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  const redirect = await request.get('/links', { maxRedirects: 0 });
  expect(redirect.status()).toBe(301); expect(redirect.headers().location).toBe('/#links');
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
  expect((await request.get('/robots.txt')).status()).toBe(200);
  expect((await request.get('/not-a-real-page')).status()).toBe(404);
  expect((await request.get('/travels')).status()).toBe(approvedTrips.length ? 200 : 404);
  for (const trip of approvedTrips) {
    const response = await request.get(`/travels/${trip.id}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`${trip.title} travel map`);
    expect(html).not.toMatch(/travels\/preview\/|travel-draft|Unreviewed audio\/captions/);
  }
  expect((await request.get('/travels/not-an-approved-trip')).status()).toBe(404);
  expect((await request.get('/travels/preview/taiwan/train-640.webp')).status()).toBe(404);
});

test('home and notes pass layout and automated accessibility checks', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  for (const route of ['/', '/tv', '/qin']) {
    await page.goto(route);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize(testInfo.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    if (route === '/') await page.screenshot({ path: `test-results/diary-home-${testInfo.project.name}.jpg`, fullPage: true });
  }
});
