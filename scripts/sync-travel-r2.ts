// Explicit, private-only upload. Never called by a build/deploy and never scans Photos.
// Uses cf's existing login; no credentials are copied into this repo or sent to browsers.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { parseTrips, photoSrcSet } from '../lib/trips';
if (process.env.CI || process.env.WORKERS_CI) throw new Error('Private media cannot be synchronized from CI.');
const upload = process.argv.includes('--upload'), bucket = process.env.TRAVEL_R2_BUCKET;
if (!bucket || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error('Set TRAVEL_R2_BUCKET to the dedicated private bucket. Default is a local dry run; --upload performs the write.');
const cf = (args: string[]) => { const json = JSON.parse(execFileSync('cf', args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })); if (json.success === false) throw new Error('Cloudflare rejected the request.'); return json.result ?? json; };
type ReadbackVerification = {
  method: string;
  verifiedAt: string;
  size: number;
  sha256: string;
  md5: string;
  multipartEtag: string;
};
const manifestPath = '.generated/travel-draft/r2-manifest.json';
const previous: { key: string; bucket: string; verification?: ReadbackVerification }[] =
  existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : [];
const bucketAssets = previous.filter(asset => asset.bucket === bucket);
const readbacks = new Map(bucketAssets.map(asset => [asset.key, asset.verification]));
let remote = new Map<string, { size: number; etag: string }>();
if (upload) {
  const managed = cf(['r2', 'buckets', 'domains', 'managed', 'list', '--bucket-name', bucket]);
  const custom = cf(['r2', 'buckets', 'domains', 'custom', 'list', '--bucket-name', bucket]);
  if (managed.enabled !== false || !Array.isArray(custom.domains) || custom.domains.length) throw new Error('Uploads require the managed domain disabled and no custom bucket domains. Do not publish draft media.');
  let cursor: string | undefined;
  do {
    const page = cf(['r2', 'objects', 'list', '--bucket-name', bucket, '--prefix', 'draft/media/', '--per-page', '1000', ...(cursor ? ['--cursor', cursor] : [])]);
    const objects = Array.isArray(page) ? page : page.objects;
    if (!Array.isArray(objects) || (Array.isArray(page) && objects.length >= 1000)) throw new Error('Cannot establish a complete R2 listing; stop rather than assume missing keys.');
    for (const object of objects) remote.set(object.key, object);
    if (page.truncated && !page.cursor) throw new Error('Incomplete R2 listing.');
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
const trips = parseTrips(JSON.parse(await readFile('.generated/travel-draft/trips.json', 'utf8')));
if (trips.some(t => !t.draft)) throw new Error('This command only handles explicitly private drafts.');
const paths = new Set<string>();
for (const trip of trips) for (const stop of trip.stops) {
  for (const photo of stop.photos) {
    paths.add(photo.src); if (photo.original) paths.add(photo.original.src);
    for (const candidate of photoSrcSet(photo)?.split(', ') ?? []) paths.add(candidate.split(' ')[0]);
  }
  for (const video of stop.videos ?? []) for (const path of [video.src, video.poster, video.original?.src, video.captions]) if (path) paths.add(path);
}
const root = await realpath('.generated/travel-draft/media'), manifest: object[] = [];
for (const path of [...paths].sort()) {
  const match = path.match(/^\/travels\/preview\/[a-z0-9-]+\/([a-z0-9-]+\.(webp|mp4|vtt))$/);
  if (!match) throw new Error('Only sanitized, flat draft media paths may be uploaded.');
  const source = await realpath(resolve(root, match[1]));
  if (!source.startsWith(root + sep) || !(await stat(source)).isFile()) throw new Error('Media escapes the private generated directory.');
  const sha = createHash('sha256'), md5 = createHash('md5');
  for await (const chunk of createReadStream(source)) { sha.update(chunk); md5.update(chunk); }
  const sha256 = sha.digest('hex'), expected = md5.digest('hex'), size = (await stat(source)).size;
  const key = `draft/media/${sha256}.${match[2]}`, type = { webp: 'image/webp', mp4: 'video/mp4', vtt: 'text/vtt; charset=utf-8' }[match[2]]!;
  let status = size > 300_000_000 ? 'needs-s3-multipart' : 'planned';
  if (process.argv.includes('--images-only') && match[2] !== 'webp' && status === 'planned') status = 'deferred-video';
  const existing = remote.get(key);
  let verification: ReadbackVerification | undefined;
  if (upload && (status === 'planned' || existing)) {
    try {
      const object = existing ?? cf([
        'r2', 'objects', 'put', key, '--bucket-name', bucket, '--file', source,
        '--content-type', type, '--content-length', String(size),
      ]);
      const matchesSize = Number(object.size) === size;
      const etag = String(object.etag).replaceAll('"', '');
      const multipart = /^[a-f0-9]{32}-[1-9][0-9]*$/i.test(etag);
      if (!matchesSize) throw new Error('R2 size integrity verification failed.');
      if (multipart) {
        verification = readbacks.get(key);
        const matchesReadback = verification?.size === size && verification.sha256 === sha256
          && verification.md5 === expected && verification.multipartEtag === etag;
        if (!matchesReadback) {
          throw new Error(
            'Multipart ETag is not MD5; full authenticated SHA256/MD5 readback proof is required.',
          );
        }
      } else if (etag !== expected) throw new Error('R2 ETag integrity verification failed.');
      const contentType = object.httpMetadata?.contentType ?? object.http_metadata?.content_type;
      if (contentType && contentType !== type) {
        throw new Error('R2 content type differs from the sanitized asset.');
      }
      status = 'verified-private';
    } catch (error) {
      status = 'upload-failed';
      process.exitCode = 1;
      console.error(`Could not verify private upload for ${match[1]}:`, error);
    }
  }
  manifest.push({
    path, bucket, key, sha256, md5: expected, size, contentType: type, status,
    ...(verification ? { verification } : {}),
  });
  await writeFile('.generated/travel-draft/r2-manifest.json', JSON.stringify(manifest, null, 2), { mode: 0o600 });
  console.log(`${status}: ${match[1]} (${size} bytes)`);
}
console.log('Private manifest written. No domain, Worker, website deployment, original file or photo-library setting was changed.');
