import { readFileSync } from 'node:fs';

// Static export cannot generate a dynamic route with zero parameters.
// Omit travel routes entirely until reviewed content (or a local preview) exists.
const hasTrips = process.env.TRAVEL_PREVIEW === '1' || JSON.parse(readFileSync(new URL('./data/trips.json', import.meta.url), 'utf8')).length > 0;
const config = {
  pageExtensions: ['ts', 'tsx', ...(hasTrips ? ['trips.tsx'] : [])],
  output: 'export',
  trailingSlash: false,
  poweredByHeader: false,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
};
export default config;
