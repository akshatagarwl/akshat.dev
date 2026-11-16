import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Preserve the configuration path used by the previous vinext deployment.
// Both the root config and this alias publish the same static out/ directory.
const config = Bun.JSONC.parse(await readFile('wrangler.jsonc', 'utf8'));
await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/wrangler.json', JSON.stringify({
  ...config,
  $schema: '../../node_modules/wrangler/config-schema.json',
  assets: { ...config.assets, directory: '../../out' },
}, null, 2) + '\n');
console.log('Prepared static deployment config at dist/server/wrangler.json.');
