import type { Trip } from '@/lib/trips';
import { TripMap } from './TripMap';

export function TravelGallery({ trips, heading = true }: { trips: Trip[]; heading?: boolean }) {
  if (!trips.length) return null;
  return <section id="travels" className="content-section trip-gallery" aria-label="Travel maps">
    {heading && <h2>travels</h2>}
    <div className="trip-covers">{trips.map(trip => <TripMap key={trip.id} trip={trip} href={`/travels/${trip.id}`} />)}</div>
  </section>;
}
