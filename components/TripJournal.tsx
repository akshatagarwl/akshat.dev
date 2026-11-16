import type { Trip } from '@/lib/trips';
import { TripMap } from './TripMap';

// Map only: dates and photographs live in the maintained map component's popups.
export function TripJournal({ trip }: { trip: Trip }) {
  return <div className="trip-page"><TripMap trip={trip} /></div>;
}
