import { execFileSync } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [input, slug] = process.argv.slice(2);
if (!input || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? '')) throw new Error('Usage: node scripts/import-travel-video.mjs /path/to/video.mp4 your-video-slug');
const probe = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], { maxBuffer: 4 * 1024 * 1024 }));
const original = path.resolve(input), info = probe(original), duration = Number(info.format.duration);
if (!info.streams.some(s => s.codec_type === 'video') || !Number.isFinite(duration) || duration <= 0) throw new Error('A readable video with a finite duration is required.');
const folder = '.generated/travel-draft/media';
await mkdir(folder, { recursive: true });
const output = `${folder}/${slug}.mp4`, poster = `${folder}/${slug}-poster.webp`;
// Keep the complete clip; do not silently trim footage to satisfy asset limits.
const bitrate = Math.min(850000, Math.floor(22 * 1024 * 1024 * 8 / duration - 96000));
if (bitrate < 250000) throw new Error('Video is too long for a reasonable static preview. Choose a reviewed excerpt explicitly.');
const decode = process.platform === 'darwin' ? ['-hwaccel', 'videotoolbox'] : [];
console.log('Making a metadata-free, full-length H.264 preview; original remains untouched.');
if (!process.argv.includes('--finalize')) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', ...decode, '-i', original,
  '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-map_metadata:s', '-1', '-map_chapters', '-1', '-dn', '-sn',
  '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '27', '-maxrate', String(bitrate), '-bufsize', String(bitrate * 2), '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '96000', '-metadata', 'encoder=', '-metadata:s:v:0', 'handler_name=VideoHandler', '-metadata:s:a:0', 'handler_name=SoundHandler',
  '-fflags', '+bitexact', '-flags:v', '+bitexact', '-flags:a', '+bitexact', '-write_tmcd', '0', '-movflags', '+faststart', output], { stdio: 'inherit' });
const sanitized = probe(output), stream = sanitized.streams.find(s => s.codec_type === 'video');
if (stream?.codec_name !== 'h264' || stream.width > 1280 || stream.height > 720 || Math.abs(Number(sanitized.format.duration) - duration) > 0.2 || sanitized.streams.some(s => !['video', 'audio'].includes(s.codec_type)) || /location|creation_time|timecode|firmware|serial|gopro/i.test(JSON.stringify([sanitized.format.tags, ...sanitized.streams.map(s => s.tags)]))) throw new Error('Unexpected metadata/data track in derivative; do not stage it.');
if ((await stat(output)).size > 24 * 1024 * 1024) throw new Error('Derivative exceeds the static asset budget; do not stage it.');
const frame = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', String(Math.min(5, duration / 2)), '-i', output, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], { maxBuffer: 16 * 1024 * 1024 });
await sharp(frame).webp({ quality: 85 }).toFile(poster);
const record = { id: slug, src: `${slug}.mp4`, poster: `${slug}-poster.webp`, title: 'Add a factual, reviewed video description', width: stream.width, height: stream.height, duration: Number(sanitized.format.duration) };
await writeFile(`${folder}/${slug}.json`, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
