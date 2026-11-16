import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

// Local preparation only. Never modify or copy the original into public/.
const [source, id] = process.argv.slice(2);
if (!source || !id || !/^[a-z0-9-]+$/.test(id)) throw new Error('Usage: node scripts/import-travel-photo.mjs <source> <slug>');
const directory = '.generated/travel-draft/media';
await mkdir(directory, { recursive: true });
let input = source, temporary;
if (/\.heic$/i.test(source)) {
  temporary = await mkdtemp('.generated/travel-draft/decode-');
  input = `${temporary}/decoded.png`;
  execFileSync('sips', ['-s', 'format', 'png', source, '--out', input], { stdio: 'ignore' });
}
try {
const original = `${directory}/${id}-original.webp`;
await sharp(input).rotate().keepIccProfile().webp({ lossless: true, effort: 2 }).toFile(original);
const full = await sharp(original).metadata();
if (full.exif || full.iptc || full.xmp) throw new Error('Sensitive metadata remains in the full-resolution image.');
for (const width of [640, 1280, 1800]) {
  const destination = `${directory}/${id}-${width}.webp`;
  await sharp(input).rotate().resize({ width, withoutEnlargement: true }).toColourspace('srgb').webp({ quality: 85 }).toFile(destination);
  const metadata = await sharp(destination).metadata();
  if (metadata.exif || metadata.iptc || metadata.xmp) throw new Error(`Unexpected metadata in ${destination}`);
}
console.log(JSON.stringify({ id, src: `${id}-1800.webp`, original: { src: `${id}-original.webp`, width: full.width, height: full.height } }));
} finally { if (temporary) await rm(temporary, { recursive: true, force: true }); }
