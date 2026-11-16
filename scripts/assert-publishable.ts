import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

if (process.env.TRAVEL_PREVIEW === '1' || !existsSync('out') || existsSync('out/travels/preview')) {
  throw new Error('Refusing to publish a private travel preview. Build without TRAVEL_PREVIEW and review/approve media first.');
}
function checkSize(path: string) { for (const entry of readdirSync(path, { withFileTypes: true })) { const file = join(path, entry.name); if (entry.isDirectory()) checkSize(file); else if (statSync(file).size > 25 * 1024 * 1024) throw new Error('Static asset exceeds Cloudflare’s 25MiB limit. Do not degrade video to fit; obtain approval for appropriate media hosting instead.'); } }
checkSize('out');
console.log('Publication guard: no private preview assets or oversized static files.');
