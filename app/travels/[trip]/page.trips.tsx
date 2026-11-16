import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TripJournal } from '@/components/TripJournal';
import { readTrips } from '@/lib/read-trips';

export const dynamicParams = false;
export function generateStaticParams() { return readTrips().map(trip => ({ trip: trip.id })); }
export async function generateMetadata({ params }: { params: Promise<{ trip: string }> }): Promise<Metadata> {
  const { trip: id } = await params;
  const trip = readTrips().find(t => t.id === id);
  return trip ? { title: `${trip.title} — travels`, alternates: { canonical: `/travels/${id}` }, ...(trip.draft ? { robots: { index: false, follow: false } } : {}) } : {};
}
export default async function TripPage({ params }: { params: Promise<{ trip: string }> }) {
  const { trip: id } = await params;
  const trip = readTrips().find(t => t.id === id);
  if (!trip) notFound();
  return <TripJournal trip={trip} />;
}
