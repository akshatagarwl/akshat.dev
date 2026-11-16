// Preserve encoded A/V packets. Remove container/device/location tags and data tracks;
// originals are never changed. Keep codec colour/HDR/orientation information intact.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const [source, slug] = process.argv.slice(2);
if (!source || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) throw new Error('Usage: node scripts/import-travel-video-original.mjs /path/to/video slug');
if (!(await stat(source)).isFile() || process.env.CI) throw new Error('Original preparation requires a local file outside CI.');
const probe = path => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-show_data', '-of', 'json', path], { maxBuffer: 4 * 1024 * 1024 }).toString());
const input = probe(source), stream = input.streams.find(s => s.codec_type === 'video');
if (!stream || !['h264', 'hevc'].includes(stream.codec_name) || input.streams.some(s => s.codec_type === 'audio' && s.codec_name !== 'aac')) throw new Error('Needs a separately reviewed browser-compatible derivative, not an automatic lossy conversion.');
const dir = '.generated/travel-draft/media', output = `${dir}/${slug}-original.mp4`, poster = `${dir}/${slug}-original-poster.webp`;
await mkdir(dir, { recursive: true });
if (!process.argv.includes('--finalize')) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', source, '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-map_metadata:s', '-1', '-map_chapters', '-1', '-dn', '-sn', '-c', 'copy', '-metadata', 'encoder=', '-metadata:s:v:0', 'handler_name=VideoHandler', '-metadata:s:a:0', 'handler_name=SoundHandler', '-fflags', '+bitexact', '-write_tmcd', '0', '-movflags', '+faststart', output], { stdio: 'inherit' });
const result = probe(output), video = result.streams.find(s => s.codec_type === 'video');
if (result.streams.some(s => !['video', 'audio'].includes(s.codec_type)) || JSON.stringify([result.format.tags, ...result.streams.map(s => s.tags)]).match(/location|creation_time|timecode|firmware|serial|gopro/i)) throw new Error('Unexpected private metadata or data tracks remain.');
const sensitive = execFileSync('exiftool', ['-ee', '-s', '-GPSLatitude', '-GPSLongitude', '-SerialNumber', '-CameraSerialNumber', output], { maxBuffer: 1024 * 1024 }).toString().trim();
if (sensitive) throw new Error('Sensitive embedded metadata remains; do not upload.');
for (const selector of ['v:0', ...(input.streams.some(s => s.codec_type === 'audio') ? ['a:0'] : [])]) {
  const hash = path => execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-map', `0:${selector}`, '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], { maxBuffer: 1024 * 1024 }).toString().trim();
  if (hash(source) !== hash(output)) throw new Error('Encoded packet checksum changed; investigate before claiming original quality.');
}
const hdr = ['arib-std-b67', 'smpte2084'].includes(video.color_transfer);
if (hdr) {
  if (process.platform !== 'darwin') throw new Error('HDR poster needs a reviewed, tone-mapped thumbnail. Do not silently export washed-out colours.');
  const temp = await mkdtemp('.generated/travel-draft/hdr-poster-');
  try {
    execFileSync('qlmanage', ['-t', '-s', '1280', '-o', temp, output], { stdio: 'ignore' });
    await sharp(`${temp}/${slug}-original.mp4.png`).webp({ quality: 94 }).toFile(poster);
  } finally { await rm(temp, { recursive: true, force: true }); }
} else {
  const frame = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(Math.min(2, Number(result.format.duration) / 3)), '-i', output, '-frames:v', '1', '-vf', 'scale=1280:-2', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 20 * 1024 * 1024 });
  await sharp(frame).webp({ quality: 94 }).toFile(poster);
}
const rotation = Math.abs(video.side_data_list?.find(s => s.rotation !== undefined)?.rotation || 0) % 180;
const config = Buffer.from(video.extradata.split('\n').filter(line => line.includes(':')).map(line => line.slice(line.indexOf(':') + 1).trim().split('  ')[0].replaceAll(' ', '')).join(''), 'hex');
let codecString;
if (video.codec_name === 'h264') codecString = `avc1.${config.subarray(1, 4).toString('hex')}`;
else {
  let compatibility = 0; const flags = config.readUInt32BE(2);
  for (let i = 0; i < 32; i++) compatibility = (compatibility * 2 + ((flags >>> i) & 1)) >>> 0;
  const constraints = [...config.subarray(6, 12)]; while (constraints.at(-1) === 0) constraints.pop();
  codecString = `${video.codec_tag_string}.${['', 'A', 'B', 'C'][config[1] >> 6]}${config[1] & 31}.${compatibility.toString(16)}.${config[1] & 32 ? 'H' : 'L'}${config[12]}${constraints.length ? '.' + constraints.map(n => n.toString(16).padStart(2, '0').toUpperCase()).join('.') : ''}`;
}
const record = { id: slug, src: `${slug}-original.mp4`, poster: `${slug}-original-poster.webp`, title: 'Add a factual, reviewed description', width: rotation === 90 ? video.height : video.width, height: rotation === 90 ? video.width : video.height, duration: Number(result.format.duration), codec: video.codec_name, mime: `video/mp4; codecs="${codecString}"`, frameRate: video.r_frame_rate, hdr, verifiedEncodedPackets: true };
await writeFile(`${dir}/${slug}-original.json`, JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(record, null, 2));
