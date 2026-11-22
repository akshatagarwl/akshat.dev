export type OriginalMedia = { src: string; width: number; height: number };
export type RecordedGps = [longitude: number, latitude: number];
export type TripPhoto = { gps?: RecordedGps; original?: OriginalMedia; id: string; src: string; alt: string; width: number; height: number; caption?: string | null };
export type VideoPosition = [seconds: number, longitude: number, latitude: number];
export type TripVideo = { gps?: RecordedGps; original?: OriginalMedia & { mime: string }; id: string; src: string; poster: string; title: string; width: number; height: number; duration: number; caption?: string | null; captions?: string; track?: VideoPosition[] };
export type TripStop = { id: string; place: string; date?: string; location?: [number, number]; locationNote?: string; note?: string; photos: TripPhoto[]; videos?: TripVideo[] };
export type Trip = { id: string; title: string; month: string; cover: TripPhoto; stops: TripStop[]; draft?: boolean };

// Videos too large for static assets are served from the public R2 bucket on this origin.
export const MEDIA_ORIGIN = 'https://media.akshat.dev';
const mediaPath = (extension: string) => new RegExp(`^(?:${MEDIA_ORIGIN.replaceAll('.', '\\.')})?/travels/(?:[a-z0-9-]+/)+[a-z0-9-]+\\.${extension}$`);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const slug = (v: unknown): v is string => text(v) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
function original(value: unknown, extension: 'webp' | 'mp4'): OriginalMedia | undefined {
  if (value === undefined) return;
  if (!object(value) || !text(value.src) || !(extension === 'mp4' ? mediaPath('mp4') : new RegExp(`^/travels/(?:[a-z0-9-]+/)+[a-z0-9-]+\\.${extension}$`)).test(value.src) || ![value.width, value.height].every(n => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 12000)) throw new Error('Original-quality media needs a safe local or approved video-host path and valid dimensions.');
  return { src: value.src, width: value.width as number, height: value.height as number };
}
function recordedGps(value: unknown): RecordedGps | undefined {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length !== 2
    || !value.every(coordinate => typeof coordinate === 'number' && Number.isFinite(coordinate))
    || Math.abs(value[0]) > 180 || Math.abs(value[1]) >= 85) {
    throw new Error('Media GPS must be an original, finite longitude/latitude pair.');
  }
  return [value[0], value[1]];
}

function photo(value: unknown): TripPhoto {
  if (!object(value) || !slug(value.id) || !text(value.src) || !/^\/travels\/(?:[a-z0-9-]+\/)+[a-z0-9-]+\.(?:webp|avif|jpg|png)$/.test(value.src) || !text(value.alt)) throw new Error('Trip photos need an id, a local image and descriptive alt text.');
  if (![value.width, value.height].every(n => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 12000)) throw new Error('Trip photos need valid dimensions.');
  if (value.caption !== undefined && value.caption !== null && !text(value.caption)) throw new Error('Photo captions must be null or nonempty text.');
  return { gps: recordedGps(value.gps), original: original(value.original, 'webp'), id: value.id, src: value.src, alt: value.alt, width: value.width as number, height: value.height as number, caption: value.caption as string | null | undefined };
}

function video(value: unknown): TripVideo {
  const local = (path: unknown, extension: string) => text(path) && new RegExp(`^/travels/(?:[a-z0-9-]+/)+[a-z0-9-]+\\.${extension}$`).test(path);
  if (!object(value) || !slug(value.id) || !(text(value.src) && mediaPath('mp4').test(value.src)) || !local(value.poster, 'webp') || !text(value.title)) throw new Error('Videos need an id, a local or approved hosted MP4, a local poster and descriptive title.');
  if (![value.width, value.height].every(n => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 12000) || typeof value.duration !== 'number' || !Number.isFinite(value.duration) || value.duration <= 0) throw new Error('Videos need valid dimensions and duration.');
  if (value.caption !== undefined && value.caption !== null && !text(value.caption)) throw new Error('Video captions must be null or nonempty text.');
  if (value.captions !== undefined && !local(value.captions, 'vtt')) throw new Error('Captions must be a local VTT file.');
  if (value.track !== undefined && (!Array.isArray(value.track) || value.track.length < 2 || value.track.length > 10000 || value.track.some((point, i, all) => !Array.isArray(point) || point.length !== 3 || !point.every(n => typeof n === 'number' && Number.isFinite(n)) || point[0] < 0 || point[0] > (value.duration as number) || Math.abs(point[1]) > 180 || Math.abs(point[2]) >= 85 || (i > 0 && point[0] <= all[i - 1][0])))) throw new Error('Recorded GPS needs ordered, finite relative-time samples within the video.');
  const full = original(value.original, 'mp4');
  if (full && (!object(value.original) || !text(value.original.mime) || !/^video\/mp4; codecs="[A-Za-z0-9.]+"$/.test(value.original.mime))) throw new Error('Original video needs its validated MP4 codec MIME type.');
  return { gps: recordedGps(value.gps), original: full ? { ...full, mime: (value.original as Record<string, unknown>).mime as string } : undefined, id: value.id, src: value.src as string, poster: value.poster as string, title: value.title, width: value.width as number, height: value.height as number, duration: value.duration, caption: value.caption as string | null | undefined, captions: value.captions as string | undefined, track: value.track as VideoPosition[] | undefined };
}

export type TripMapItem = {
  id: string; stopId: string; place: string; date: string; gps?: RecordedGps;
} & ({ kind: 'photo'; media: TripPhoto } | { kind: 'video'; media: TripVideo });

/** All photos and videos in date order; items on the same date keep their record order. */
export function tripMedia(trip: Trip): TripMapItem[] {
  return trip.stops.flatMap(stop => {
    const context = { stopId: stop.id, place: stop.place, date: stop.date ?? trip.month };
    return [
      ...stop.photos.map(media => ({
        ...context, id: media.id, gps: media.gps, kind: 'photo' as const, media,
      })),
      ...(stop.videos ?? []).map(media => ({
        ...context, id: media.id, gps: media.gps, kind: 'video' as const, media,
      })),
    ];
  }).toSorted((first, second) => first.date.localeCompare(second.date));
}

export function videoDuration(seconds: number) { const whole = Math.ceil(seconds); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`; }

/** Interpolate only adjacent recorded samples; never bridge a GPS outage. */
export function videoPosition(track: VideoPosition[] | undefined, time: number): [number, number] | undefined {
  if (!track?.length || !Number.isFinite(time) || time < track[0][0]) return;
  const next = track.findIndex(p => p[0] > time);
  if (next === -1) { const last = track[track.length - 1]; return time - last[0] <= 1.5 ? [last[1], last[2]] : undefined; }
  const a = track[next - 1], b = track[next];
  if (time === a[0]) return [a[1], a[2]];
  if (b[0] - a[0] > 5) return;
  const t = (time - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Local, reviewed content only. Approximate centres by default; recorded video GPS needs explicit owner authorization. */
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
      if (!object(stop) || !slug(stop.id) || stops.has(stop.id) || !text(stop.place) || !Array.isArray(stop.photos) || (stop.videos !== undefined && !Array.isArray(stop.videos))) throw new Error('Stops need unique slugs, a place and local media.');
      if (stop.location !== undefined && (!Array.isArray(stop.location) || stop.location.length !== 2 || !stop.location.every(n => typeof n === 'number' && Number.isFinite(n)) || Math.abs(stop.location[0]) > 180 || Math.abs(stop.location[1]) >= 85)) throw new Error('Locations must be finite longitude/latitude pairs within Mercator bounds.');
      if (stop.date !== undefined && (!text(stop.date) || !/^\d{4}-\d{2}-\d{2}$/.test(stop.date) || !Number.isFinite(Date.parse(`${stop.date}T00:00:00Z`)) || new Date(`${stop.date}T00:00:00Z`).toISOString().slice(0, 10) !== stop.date)) throw new Error('Stop dates must be real YYYY-MM-DD dates.');
      for (const key of ['note', 'locationNote']) if (stop[key] !== undefined && !text(stop[key])) throw new Error('Stop notes must be nonempty.');
      const parsed = stop.photos.map(photo);
      for (const p of parsed) { if (photos.has(p.id)) throw new Error('Photo ids must be unique within a trip.'); photos.add(p.id); }
      const videos = (stop.videos as unknown[] | undefined)?.map(video);
      if (!parsed.length && !videos?.length) throw new Error('Stops need at least one photo or video.');
      for (const v of videos ?? []) { if (photos.has(v.id)) throw new Error('Media ids must be unique within a trip.'); photos.add(v.id); }
      stops.add(stop.id);
      return { id: stop.id, place: stop.place, date: stop.date as string | undefined, photos: parsed, videos, location: stop.location as [number, number] | undefined, locationNote: stop.locationNote as string | undefined, note: stop.note as string | undefined };
    });
    const cover = photo(trip.cover);
    if (!parsedStops.some(s => s.photos.some(p => p.id === cover.id && p.src === cover.src) || s.videos?.some(v => v.id === cover.id && v.poster === cover.src))) throw new Error('The cover must be a photograph in the trip.');
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
