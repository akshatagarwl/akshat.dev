import { existsSync } from 'node:fs';

if (process.env.TRAVEL_PREVIEW === '1' || !existsSync('out') || existsSync('out/travels/preview')) {
  throw new Error('Refusing to publish a private travel preview. Build without TRAVEL_PREVIEW and review/approve media first.');
}
console.log('Publication guard: no private preview assets.');
