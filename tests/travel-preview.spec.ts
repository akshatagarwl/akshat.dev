import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const trip = '/travels/taiwan';

test('private Taiwan gallery and diary use real, local photos without external requests', async ({ page }) => {
  const external: string[] = [], errors: string[] = [];
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:4323') && !r.url().startsWith('data:')) external.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.locator('#travels .trip-cover').click();
  await expect(page).toHaveURL(new RegExp(`${trip}$`));
  await expect(page.getByRole('heading', { name: 'Taiwan', exact: true })).toBeVisible();
  await expect(page.getByText('local draft · not published')).toBeVisible();
  await expect(page.locator('.trip-stop')).toHaveCount(2);
  await expect(page.locator('.trip-photographs img')).toHaveCount(2);
  await expect(page.locator('.trip-stop-note')).toHaveCount(0);
  await expect(page.locator('.map-stop')).toHaveCount(2);
  await expect(page.locator('.trip-map path')).toHaveCount(2);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'three');
  await expect(page.locator('.trip-map-stage > canvas')).toBeVisible();
  const stage = (await page.locator('.trip-map-stage').boundingBox())!;
  expect(stage.height).toBeGreaterThan(page.viewportSize()!.height / 2);
  expect((await page.locator('.trip-pages').boundingBox())!.y).toBeGreaterThan(stage.y + stage.height);
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('Three.js orbit and zoom are bounded, fit resets, and wheel scrolling is never captured', async ({ page }) => {
  await page.goto(trip);
  const stage = page.locator('.trip-map-stage');
  const zoom = page.getByRole('button', { name: 'Zoom in', exact: true });
  for (let i = 0; i < 6; i++) await zoom.click();
  await expect(zoom).toBeDisabled();
  await expect(stage).toHaveAttribute('data-zoom', '6.00');
  await page.getByRole('button', { name: 'Fit Taiwan' }).click();
  await expect(stage).toHaveAttribute('data-zoom', '1.00');
  await expect(page.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled();
  const beforeCamera = await stage.getAttribute('data-camera');
  await stage.focus(); await page.keyboard.press('Shift+ArrowRight');
  await expect(stage).not.toHaveAttribute('data-camera', beforeCamera!);
  await page.keyboard.press('ArrowDown');
  await page.getByRole('button', { name: 'Fit Taiwan' }).click();
  await expect(stage).toHaveAttribute('data-camera', beforeCamera!);
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .55); await page.mouse.down();
  await page.mouse.move(box.x + box.width * .5 + 60, box.y + box.height * .55 + 30, { steps: 5 }); await page.mouse.up();
  await expect(stage).not.toHaveAttribute('data-camera', beforeCamera!);
  await page.getByRole('button', { name: 'Fit Taiwan' }).click();
  await expect(stage).toHaveAttribute('data-camera', beforeCamera!);
  await stage.hover();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  await expect(stage).toHaveAttribute('data-zoom', '1.00');
});

test('touch over the map scrolls the document without zooming', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4323' + trip);
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'three');
  const box = (await page.locator('.trip-map-stage').boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 20 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50);
  await expect(page.locator('.trip-map-stage')).toHaveAttribute('data-zoom', '1.00');
  await context.close();
});

test('reading forward and back changes the active map place without hiding prose', async ({ page }) => {
  await page.goto(trip);
  await page.locator('#stop-jiufen').scrollIntoViewIfNeeded();
  await expect(page.locator('.map-stop-list [aria-current="location"]')).toHaveText('Jiufen');
  await page.locator('#stop-hualien-area').scrollIntoViewIfNeeded();
  await expect(page.locator('.map-stop-list [aria-current="location"]')).toHaveText('Hualien area');
  await page.locator('.map-stop-list a').filter({ hasText: 'Jiufen' }).click();
  await expect(page.locator('.map-place-card h2')).toHaveText('Jiufen');
  await expect(page).toHaveURL(new RegExp(`${trip}$`));
});

test('photos open in a native modal with keyboard navigation, Escape and focus return', async ({ page }) => {
  await page.goto(trip);
  const photo = page.locator('.trip-photo-link').first();
  const [imageTab] = await Promise.all([page.context().waitForEvent('page'), photo.click({ modifiers: ['ControlOrMeta'] })]);
  await expect(imageTab).toHaveURL(/train-1800\.webp$/); await imageTab.close();
  await expect(page.locator('dialog')).not.toBeVisible();
  await photo.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText('Hualien area');
  await expect(dialog.getByRole('button', { name: 'previous' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'close' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'next' })).toBeFocused();
  // Native modality makes background links inert; browser chrome may remain tabbable.
  await page.locator('.site-brand').evaluate(el => (el as HTMLElement).focus());
  await expect(page.locator('.site-brand')).not.toBeFocused();
  await expect(dialog).toHaveJSProperty('open', true);
  await dialog.getByRole('button', { name: 'close' }).focus();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('heading')).toHaveText('Jiufen');
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('heading')).toHaveText('Hualien area');
  await dialog.getByRole('button', { name: 'next' }).click();
  await expect(dialog.getByRole('heading')).toHaveText('Jiufen');
  await expect(dialog.getByRole('button', { name: 'close' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('heading')).toHaveText('Hualien area');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(photo).toBeFocused();
});

test('map markers select photos without leaving the map, and the renderer sleeps when idle', async ({ page }) => {
  await page.goto(trip);
  await page.getByRole('button', { name: 'Explore Jiufen', exact: true }).click();
  await expect(page.locator('.map-place-card h2')).toHaveText('Jiufen');
  await expect(page).toHaveURL(new RegExp(`${trip}$`));
  const stage = page.locator('.trip-map-stage');
  await expect(stage).toHaveAttribute('data-renders', /[1-9]/);
  await page.waitForTimeout(150);
  const frames = await stage.getAttribute('data-renders');
  await page.waitForTimeout(250);
  expect(await stage.getAttribute('data-renders')).toBe(frames);
  await page.getByRole('button', { name: 'View photo', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('Jiufen');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'View photo', exact: true })).toBeFocused();
});

test('WebGL context loss releases the canvas and retains the SVG and photographs', async ({ page }) => {
  await page.goto(trip);
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'three');
  await page.locator('.trip-map-stage > canvas').evaluate(canvas => (canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator('.trip-map')).toHaveAttribute('data-renderer', 'svg');
  await expect(page.locator('.trip-map-stage > canvas')).toHaveCount(0);
  await expect(page.locator('.trip-map-drawing')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeDisabled();
  await page.locator('.map-stop-list a').last().click();
  await expect(page).toHaveURL(/#stop-jiufen$/);
  await expect(page.locator('#heading-jiufen')).toBeInViewport();
});

test('unsupported native dialogs retain the original image link', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { value: undefined }));
  await page.goto(trip);
  await page.locator('.trip-photo-link').first().click();
  await expect(page).toHaveURL(/train-1800\.webp$/);
});

test('no JavaScript retains the complete gallery, map links and image fallback', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4323' + trip);
  await expect(page.locator('.trip-stop')).toHaveCount(2);
  await expect(page.locator('.trip-photographs img').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeDisabled();
  await page.locator('.map-stop-list a').last().click();
  await expect(page).toHaveURL(/#stop-jiufen$/);
  await expect(page.locator('.trip-photo-link').last()).toHaveAttribute('href', /jiufen-1800.webp$/);
  await context.close();
});

test('reduced motion removes sticky scenery and automatic camera movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(trip);
  await expect(page.locator('.trip-map')).not.toHaveCSS('position', 'sticky');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const before = await page.locator('.trip-map-stage').getAttribute('data-camera');
  await page.locator('#stop-jiufen').scrollIntoViewIfNeeded();
  await expect(page.locator('.map-stop-list [aria-current="location"]')).toHaveText('Jiufen');
  expect(await page.locator('.trip-map-stage').getAttribute('data-camera')).toBe(before);
});

test('private export is isolated from production and publication is refused', async () => {
  expect(existsSync('out')).toBe(false);
  expect(existsSync('.generated/travel-export/travels/taiwan.html')).toBe(true);
  const result = spawnSync('bun', ['scripts/assert-publishable.ts'], { encoding: 'utf8' });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Refusing to publish a private travel preview');
});

test('sanitized copies have no EXIF, IPTC or XMP', async ({ request }) => {
  for (const name of ['train', 'jiufen']) for (const width of [640, 1280, 1800]) {
    const r = await request.get(`/travels/preview/taiwan/${name}-${width}.webp`);
    expect(r.status()).toBe(200);
    const info = await sharp(await r.body()).metadata();
    expect(info.width).toBe(width);
    expect(info.exif).toBeUndefined(); expect(info.iptc).toBeUndefined(); expect(info.xmp).toBeUndefined();
  }
});

test('trip and gallery remain accessible and fit narrow screens', async ({ page }, info) => {
  test.setTimeout(90000);
  for (const path of ['/travels', trip]) {
    await page.goto(path);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize(info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    if (path === trip) await page.screenshot({ path: `test-results/taiwan-${info.project.name}.jpg`, fullPage: true });
  }
});
