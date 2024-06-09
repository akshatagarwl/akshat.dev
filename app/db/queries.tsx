'use server';

import { sql } from './postgres';
import { unstable_noStore as noStore } from 'next/cache';

export async function getViewsCount(): Promise<
  { slug: string; count: number }[]
> {
  if (!process.env.POSTGRES_URL) {
    return [];
  }

  noStore();
  return sql`
    SELECT slug, count
    FROM views
  `;
}
