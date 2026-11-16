// Loopback-only private preview; sirv supplies static files and byte-range streaming.
// Large, high-quality videos must never be sent to Cloudflare's static asset uploader.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import sirv from 'sirv';

if (process.env.CI) throw new Error('Private travel previews are not served in CI.');
const root = '.generated/travel-export';
if (!/<meta name="robots" content="noindex/.test(readFileSync(`${root}/index.html`, 'utf8'))) throw new Error('Build an isolated, noindex travel preview first.');
const port = Number(process.argv[2] || 4321);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid loopback port.');
const headers = Object.fromEntries(readFileSync(`${root}/_headers`, 'utf8').split('\n').filter(line => line.startsWith('  ')).map(line => { const i = line.indexOf(':'); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; }));
const notFound = readFileSync(`${root}/404.html`);
const assets = sirv(root, { dev: true, etag: true, extensions: ['html'], setHeaders(res) { for (const [key, value] of Object.entries(headers)) res.setHeader(key, value); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); } });
createServer((req, res) => {
  const allowed = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!allowed.includes(req.headers.host) || (req.headers.origin && !allowed.some(host => req.headers.origin === `http://${host}`))) { res.writeHead(403); res.end(); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  if (req.url === '/links') { res.writeHead(302, { Location: '/#links' }); res.end(); return; }
  // decodeURI in sirv deliberately preserves reserved '@'; our production-safe
  // MapLibre URLs encode it, so canonicalize that one character for local files.
  req.url = req.url?.replace(/%40/ig, '@');
  assets(req, res, () => { res.writeHead(404, { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' }); res.end(req.method === 'HEAD' ? undefined : notFound); });
}).listen(port, '127.0.0.1', () => console.log(`Private travel preview: http://127.0.0.1:${port}`));
