import type { Trip } from '@/lib/trips';
import { photoSrcSet } from '@/lib/trips';
import { travelDate } from '@/lib/travels';

export function TravelGallery({ trips, heading = true }: { trips: Trip[]; heading?: boolean }) {
  if (!trips.length) return null;
  return <section id="travels" className="content-section trip-gallery" aria-label="Travel photo diaries">
    {heading && <h2>travels</h2>}
    <div className="trip-covers">{trips.map(trip => <a key={trip.id} className="trip-cover" href={`/travels/${trip.id}`}>
      <img src={trip.cover.src} srcSet={photoSrcSet(trip.cover)} sizes="(max-width: 720px) 90vw, 640px" alt={trip.cover.alt} width={trip.cover.width} height={trip.cover.height} loading="lazy" />
      <span className="trip-cover-label"><span>{trip.title}</span><time dateTime={trip.month}>{travelDate(trip.month)}</time></span>
    </a>)}</div>
  </section>;
}
