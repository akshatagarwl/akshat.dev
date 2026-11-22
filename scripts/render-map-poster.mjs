import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { mapRegions } from '../lib/map-regions.ts';

const url = new URL(process.env.MAP_PREVIEW_URL ?? 'http://127.0.0.1:4321');
if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.search || url.hash) throw new Error('Use a plain loopback preview URL.');
const region = mapRegions[process.env.MAP_REGION ?? 'taiwan'];
if (!region) throw new Error('Choose a supported MAP_REGION.');
const style = JSON.parse(await readFile('data/map-style.json', 'utf8'));
const css = await readFile('node_modules/maplibre-gl/dist/maplibre-gl.css', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(new URL('/robots.txt', url).href);
  await page.setContent(`<style>${css}body{margin:0}#poster{width:1200px;height:800px}</style><div id="poster"></div>`);
  for (const name of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs']) {
    await page.route(`${url.origin}/__maplibre/${name}`, route =>
      route.fulfill({ path: `node_modules/maplibre-gl/dist/${name}`, contentType: 'text/javascript' }));
  }
  await page.addScriptTag({ type: 'module', content: 'import * as library from "/__maplibre/maplibre-gl.mjs"; window.maplibregl = library;' });
  await page.waitForFunction(() => Boolean(window.maplibregl));
  await page.addScriptTag({ path: 'node_modules/pmtiles/dist/pmtiles.js' });
  // A separate, region-only map never receives personal records, pins or camera positions.
  await page.evaluate(async ({ region, style, origin }) => {
    maplibregl.setWorkerUrl(`${origin}/maps/maplibre-worker.mjs`);
    const response = await fetch(`${origin}${region.archive}`);
    if (!response.ok) throw new Error('Local regional archive is unavailable.');
    const protocol = new pmtiles.Protocol();
    protocol.add(new pmtiles.PMTiles(new pmtiles.FileSource(new File([await response.arrayBuffer()], region.archiveKey))));
    maplibregl.addProtocol('pmtiles', protocol.tile);
    const map = new maplibregl.Map({
      container: 'poster', bounds: region.bounds, fitBoundsOptions: { padding: 48 },
      interactive: false, renderWorldCopies: false,
      style: {
        ...style, glyphs: `${origin}${style.glyphs}`, sprite: `${origin}${style.sprite}`,
        sources: { protomaps: { ...style.sources.protomaps, url: `pmtiles://${region.archiveKey}`, maxzoom: region.archiveMaxZoom } },
      },
      transformRequest: resource => ({ url: resource.replaceAll('@', '%40') }),
    });
    await new Promise((resolve, reject) => {
      map.once('idle', resolve);
      map.once('error', event => reject(event.error));
    });
  }, { region, style, origin: url.origin });
  const screenshot = await page.locator('#poster').screenshot();
  await sharp(screenshot).webp({ quality: 86 }).toFile(`public${region.poster}`);
  console.log(`Rendered generic ${region.label} poster; no personal records loaded.`);
} finally { await browser.close(); }
