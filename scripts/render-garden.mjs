import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const engine = await readFile(new URL('../vendor/seedbed/engine.js', import.meta.url));
const server = createServer((request, response) => {
  if (request.url === '/engine.js') { response.writeHead(200, { 'Content-Type': 'text/javascript' }); response.end(engine); return; }
  const side = request.url === '/margin';
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end(`<html><body style="margin:0"><div id="garden" style="width:${side ? 180 : 640}px;height:${side ? 900 : 224}px"></div><script type="module">
    import { createGarden, PRESETS } from '/engine.js';
    createGarden(document.querySelector('#garden'), { pitch:${side ? 38 : 32}, radius:${side ? 110 : 150}, height:1.65, speed:1.15, wiltDelay:550, seed:17, maxBlooms:120, ghost:false,
      custom:{...PRESETS.meadow, card:'#f6f4eb', dot:'#d4cfbf', petals:['#e477a6','#a58bdd','#efb946','#ec8d55','#6aa9ce','#d65c7b','#f3d86a','#8d9cdb'], heads:['cosmos','daisy','tulip','spike']} });
  </script></body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined });
  for (const side of [false, true]) {
    const page = await browser.newPage({ viewport: side ? { width: 180, height: 900 } : { width: 640, height: 224 }, deviceScaleFactor: 2 });
    await page.goto(`http://127.0.0.1:${server.address().port}/${side ? 'margin' : ''}`);
    await page.waitForSelector('canvas');
    const points = side ? [100, 210, 320, 430, 540, 650, 760, 850] : [96, 176, 256, 336, 416, 496, 560];
    for (const n of points) {
      await page.mouse.move(side ? 90 : n, side ? n : 145);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(330);
    const png = await page.locator('canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
    const output = side ? 'garden-margin.png' : 'garden-fallback.png';
    await writeFile(new URL(`../public/${output}`, import.meta.url), Buffer.from(png, 'base64'));
    console.log(`Rendered local Seedbed flowers to public/${output}.`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.closeAllConnections();
  server.close();
}
