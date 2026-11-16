import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/tv', '/qin'].map(path => ({ url: `https://akshat.dev${path}` }));
}
