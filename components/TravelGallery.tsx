import type { Trip } from '@/lib/trips';
import { travelDate } from '@/lib/travels';
import { TripMap } from './TripMap';

export function TravelGallery({ trips, heading = true }: { trips: Trip[]; heading?: boolean }) {
  if (!trips.length) return null;
  return <section id="travels" className="content-section trip-gallery" aria-label="Travel maps">
    {heading && <h2>travels</h2>}
    <div className="trip-covers">{trips.map(trip => <article key={trip.id} className="trip-map-preview">
      <TripMap stops={trip.stops} href={`/travels/${trip.id}`} />
      <a className="trip-cover-label trip-cover" href={`/travels/${trip.id}`}><span>{trip.title}</span><time dateTime={trip.month}>{travelDate(trip.month)}</time></a>
    </article>)}</div>
  </section>;
}
