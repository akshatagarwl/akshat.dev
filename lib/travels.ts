export type TravelPhoto = { src: string; alt: string; caption?: string };
export type TravelStop = { id: string; date: string; place: string; region?: string; note?: string; terrain?: 'mountain' | 'coast' | 'trail' | 'city'; photos?: TravelPhoto[] };

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Trusted local content, validated at build time; no public write endpoint. */
export function parseTravels(value: unknown): TravelStop[] {
  if (!Array.isArray(value)) throw new Error('Travels must be an array.');
  const ids = new Set<string>();
  const stops = value.map((stop): TravelStop => {
    if (!object(stop) || !text(stop.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stop.id) || ids.has(stop.id)) throw new Error('Each travel needs a unique, lowercase slug id.');
    if (!text(stop.date) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(stop.date) || !text(stop.place)) throw new Error(`Travel ${stop.id}: provide place and date (YYYY-MM).`);
    for (const key of ['region', 'note'] as const) if (stop[key] !== undefined && !text(stop[key])) throw new Error(`Travel ${stop.id}: ${key} must be nonempty text.`);
    if (stop.photos !== undefined && (!Array.isArray(stop.photos) || !stop.photos.every(photo => object(photo) && text(photo.src) && /^\/travels\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp|avif)$/.test(photo.src) && text(photo.alt) && (photo.caption === undefined || text(photo.caption))))) throw new Error(`Travel ${stop.id}: photos need local /travels/ image paths and descriptive alt text.`);
    if (stop.terrain !== undefined && !['mountain', 'coast', 'trail', 'city'].includes(stop.terrain as string)) throw new Error(`Travel ${stop.id}: unknown terrain.`);
    ids.add(stop.id);
    return { id: stop.id, date: stop.date, place: stop.place, region: stop.region as string | undefined, note: stop.note as string | undefined, terrain: stop.terrain as TravelStop['terrain'], photos: stop.photos as TravelPhoto[] | undefined };
  });
  return stops.sort((a, b) => b.date.localeCompare(a.date));
}

export function travelDate(date: string) {
  const [year, month] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01T00:00:00Z`));
}
