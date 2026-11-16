// Explicit owner-requested GPS extraction only. Writes ignored relative-time samples,
// never UTC timestamps, altitude, device IDs or a modified original.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const [source, slug] = process.argv.slice(2);
if (!source || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) throw new Error('Usage: node scripts/extract-travel-gps.mjs /path/to/video.mp4 slug');
if (process.env.CI) throw new Error('Private GPS extraction is local only.');
const data = JSON.parse(execFileSync('exiftool', ['-ee', '-j', '-G3', '-n', '-SampleTime', '-GPSLatitude', '-GPSLongitude', '-GPSMeasureMode', '-GPSHPositioningError', source], { maxBuffer: 16 * 1024 * 1024 }).toString())[0];
const track = Object.entries(data).flatMap(([key, time]) => {
  const match = /^(Doc\d+):SampleTime$/.exec(key); if (!match) return [];
  const prefix = match[1], lat = data[`${prefix}:GPSLatitude`], lon = data[`${prefix}:GPSLongitude`], fix = data[`${prefix}:GPSMeasureMode`], error = data[`${prefix}:GPSHPositioningError`];
  if (![time, lat, lon, fix, error].every(Number.isFinite) || time < 0 || Math.abs(lat) > 85 || Math.abs(lon) > 180 || fix < 2 || fix > 3 || error < 0 || error > 25) return [];
  return [[time, lon, lat]];
}).sort((a, b) => a[0] - b[0]);
if (track.length < 2 || track.some((p, i) => i && p[0] <= track[i - 1][0])) throw new Error('No usable, ordered GPS track. Do not invent a route.');
await mkdir('.generated/travel-draft/media', { recursive: true });
await writeFile(`.generated/travel-draft/media/${slug}-gps.json`, JSON.stringify(track), { flag: 'wx', mode: 0o600 });
console.log(`Extracted ${track.length} valid GPS samples to an ignored draft sidecar. Review before using or publishing.`);
