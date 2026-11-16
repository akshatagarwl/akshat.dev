import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

// Local preparation only. Never modify or copy the original into public/.
const [source, id] = process.argv.slice(2);
if (!source || !id || !/^[a-z0-9-]+$/.test(id)) throw new Error('Usage: node scripts/import-travel-photo.mjs <source> <slug>');
const directory = '.generated/travel-draft/media';
await mkdir(directory, { recursive: true });
for (const width of [640, 1280, 1800]) {
  const destination = `${directory}/${id}-${width}.webp`;
  await sharp(source).rotate().resize({ width, withoutEnlargement: true }).toColourspace('srgb').webp({ quality: 85 }).toFile(destination);
  const metadata = await sharp(destination).metadata();
  if (metadata.exif || metadata.iptc || metadata.xmp) throw new Error(`Unexpected metadata in ${destination}`);
}
console.log(`Prepared ${id}: oriented, resized, metadata-free WebP copies. Original untouched.`);
