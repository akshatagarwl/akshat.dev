import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { parseTrips } from '../lib/trips';

export async function prepareTrips() {
  const preview = process.env.TRAVEL_PREVIEW === '1';
  if (preview && (process.env.CI || process.env.WORKERS_CI)) throw new Error('Private travel previews cannot be built for CI/publication.');
  const approved = parseTrips(JSON.parse(await readFile('data/trips.json', 'utf8')));
  if (approved.some(t => t.draft || JSON.stringify(t).includes('/travels/preview/'))) throw new Error('Drafts/preview assets cannot appear in approved trips.');
  // Only generated preview copies are removed; originals and approved assets are never touched.
  await rm('public/travels/preview', { recursive: true, force: true });
  const drafts = preview ? parseTrips(JSON.parse(await readFile('.generated/travel-draft/trips.json', 'utf8'))) : [];
  for (const trip of drafts) {
    if (!trip.draft || approved.some(t => t.id === trip.id)) throw new Error('Preview records must be distinct, explicitly marked drafts.');
    for (const stop of trip.stops) for (const p of stop.photos) {
      const prefix = `/travels/preview/${trip.id}/`;
      if (!p.src.startsWith(prefix) || !p.src.endsWith('-1800.webp')) throw new Error('Preview media must be sanitized generated WebP images.');
      const name = p.src.slice(prefix.length).replace('-1800.webp', '');
      await mkdir(`public${prefix}`, { recursive: true });
      for (const width of [640, 1280, 1800]) await cp(`.generated/travel-draft/media/${name}-${width}.webp`, `public${prefix}${name}-${width}.webp`);
    }
  }
  await mkdir('.generated', { recursive: true });
  await writeFile('.generated/trips.json', JSON.stringify([...approved, ...drafts]));
  console.log(`Prepared ${approved.length} approved trips${preview ? ` and ${drafts.length} private previews` : '; no draft assets exported'}.`);
}
