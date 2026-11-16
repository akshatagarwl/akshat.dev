import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';

// Preserve the configuration path used by the previous vinext deployment.
// Both the root config and this alias publish the same static out/ directory.
const config = Bun.JSONC.parse(await readFile('wrangler.jsonc', 'utf8'));
await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/wrangler.json', JSON.stringify({
  ...config,
  $schema: '../../node_modules/wrangler/config-schema.json',
  assets: { ...config.assets, directory: '../../out' },
}, null, 2) + '\n');
if (process.env.TRAVEL_PREVIEW === '1') {
  // The production Wrangler config can never pick up a private preview by accident.
  await mkdir('.generated', { recursive: true });
  await rm('.generated/travel-export', { recursive: true, force: true });
  await rename('out', '.generated/travel-export');
  console.log('Private travel export isolated in .generated/travel-export; production out/ absent.');
} else {
  console.log('Prepared static deployment config at dist/server/wrangler.json.');
}
