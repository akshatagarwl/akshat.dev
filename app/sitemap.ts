import type { MetadataRoute } from 'next';
import { readTrips } from '@/lib/read-trips';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  const trips = readTrips().filter(trip => !trip.draft);
  return ['', '/tv', '/qin', ...(trips.length ? ['/travels', ...trips.map(trip => `/travels/${trip.id}`)] : [])].map(path => ({ url: `https://akshat.dev${path}` }));
}
