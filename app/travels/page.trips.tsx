import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TravelGallery } from '@/components/TravelGallery';
import { readTrips } from '@/lib/read-trips';

export const metadata: Metadata = { title: 'Gallery', alternates: { canonical: '/travels' } };
export default function Travels() {
  const trips = readTrips();
  if (!trips.length) notFound();
  return <div className="trip-index"><a href="/" className="back-link">back home</a><h1>gallery</h1><TravelGallery trips={trips} heading={false} /></div>;
}
