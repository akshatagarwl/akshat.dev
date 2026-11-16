export type TripPhoto = { id: string; src: string; alt: string; width: number; height: number; caption?: string };
export type TripStop = { id: string; place: string; date?: string; location?: [number, number]; locationNote?: string; note?: string; photos: TripPhoto[] };
export type Trip = { id: string; title: string; month: string; cover: TripPhoto; stops: TripStop[]; draft?: boolean };

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const slug = (v: unknown): v is string => text(v) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
function photo(value: unknown): TripPhoto {
  if (!object(value) || !slug(value.id) || !text(value.src) || !/^\/travels\/(?:[a-z0-9-]+\/)+[a-z0-9-]+\.(?:webp|avif|jpg|png)$/.test(value.src) || !text(value.alt)) throw new Error('Trip photos need an id, a local image and descriptive alt text.');
  if (![value.width, value.height].every(n => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 12000)) throw new Error('Trip photos need valid dimensions.');
  if (value.caption !== undefined && !text(value.caption)) throw new Error('Photo captions must be nonempty.');
  return { id: value.id, src: value.src, alt: value.alt, width: value.width as number, height: value.height as number, caption: value.caption as string | undefined };
}

/** Local, reviewed content only. Coordinates are approximate place centres, not photo GPS. */
export function parseTrips(value: unknown): Trip[] {
  if (!Array.isArray(value)) throw new Error('Trips must be an array.');
  const ids = new Set<string>();
  return value.map((trip): Trip => {
    if (!object(trip) || !slug(trip.id) || ids.has(trip.id) || !text(trip.title) || !text(trip.month) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(trip.month)) throw new Error('Trips need unique slugs, a title and YYYY-MM.');
    if (!Array.isArray(trip.stops) || !trip.stops.length) throw new Error('A trip needs at least one stop.');
    if (trip.draft !== undefined && typeof trip.draft !== 'boolean') throw new Error('Draft must be boolean.');
    const stops = new Set<string>();
    const photos = new Set<string>();
    const parsedStops = trip.stops.map((stop): TripStop => {
      if (!object(stop) || !slug(stop.id) || stops.has(stop.id) || !text(stop.place) || !Array.isArray(stop.photos) || !stop.photos.length) throw new Error('Stops need unique slugs, a place and photos.');
      if (stop.location !== undefined && (!Array.isArray(stop.location) || stop.location.length !== 2 || !stop.location.every(n => typeof n === 'number' && Number.isFinite(n)) || Math.abs(stop.location[0]) > 180 || Math.abs(stop.location[1]) >= 85)) throw new Error('Locations must be finite longitude/latitude pairs within Mercator bounds.');
      if (stop.date !== undefined && (!text(stop.date) || !/^\d{4}-\d{2}-\d{2}$/.test(stop.date) || !Number.isFinite(Date.parse(`${stop.date}T00:00:00Z`)) || new Date(`${stop.date}T00:00:00Z`).toISOString().slice(0, 10) !== stop.date)) throw new Error('Stop dates must be real YYYY-MM-DD dates.');
      for (const key of ['note', 'locationNote']) if (stop[key] !== undefined && !text(stop[key])) throw new Error('Stop notes must be nonempty.');
      const parsed = stop.photos.map(photo);
      for (const p of parsed) { if (photos.has(p.id)) throw new Error('Photo ids must be unique within a trip.'); photos.add(p.id); }
      stops.add(stop.id);
      return { id: stop.id, place: stop.place, date: stop.date as string | undefined, photos: parsed, location: stop.location as [number, number] | undefined, locationNote: stop.locationNote as string | undefined, note: stop.note as string | undefined };
    });
    const cover = photo(trip.cover);
    if (!parsedStops.some(s => s.photos.some(p => p.id === cover.id && p.src === cover.src))) throw new Error('The cover must be a photograph in the trip.');
    ids.add(trip.id);
    return { id: trip.id, title: trip.title, month: trip.month, cover, stops: parsedStops, draft: trip.draft as boolean | undefined };
  }).sort((a, b) => b.month.localeCompare(a.month));
}

export function tripDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', date.length === 10 ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' } : { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.length === 7 ? date + '-01' : date}T00:00:00Z`));
}

export function photoSrcSet(photo: TripPhoto) {
  return /-1800\.webp$/.test(photo.src) ? [640, 1280, 1800].map(width => `${photo.src.replace('-1800.webp', `-${width}.webp`)} ${width}w`).join(', ') : undefined;
}
