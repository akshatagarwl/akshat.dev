import { Mark } from '@/vendor/seedbed/Mark';
import { MountainSnow, Waves, Trees, Building2 } from 'lucide-react';
import { RoadsideScene } from '@/components/RoadsideScene';
import { travelDate, type TravelStop } from '@/lib/travels';

const terrainIcons = { mountain: MountainSnow, coast: Waves, trail: Trees, city: Building2 };

export function TravelTrail({ stops }: { stops: TravelStop[] }) {
  if (!stops.length) return null;
  return <section id="travels" className="content-section travel-section has-travels" aria-labelledby="travels-title">
    <h2 id="travels-title">travels</h2>
    <RoadsideScene />
    <ol className="travel-trail" role="list" aria-label="Travel diary, newest first">
      {stops.map((stop, index) => {
        const Terrain = terrainIcons[stop.terrain || 'trail'];
        return <li key={stop.id} id={`travel-${stop.id}`} className="travel-entry">
          {index < stops.length - 1 && <svg className="travel-route" viewBox="0 0 56 120" preserveAspectRatio="none" fill="none" aria-hidden="true"><path className="route-line" vectorEffect="non-scaling-stroke" d="M28 0C-2 37 58 81 28 120" /></svg>}
          <span className="travel-waypoint" aria-hidden="true"><span className="waypoint-dot" /><Mark size={28} /></span>
          <article className="diary-page" aria-labelledby={`travel-title-${stop.id}`}>
            <time className="diary-date" dateTime={stop.date}>{travelDate(stop.date)}</time>
            <div className="diary-content">
              <header className="diary-heading"><Terrain size={19} strokeWidth={1.1} aria-hidden="true" /><div><h3 id={`travel-title-${stop.id}`}>{stop.place}</h3>{stop.region && <p className="travel-region">{stop.region}</p>}</div></header>
              {stop.note && <p className="diary-note">{stop.note}</p>}
              {!!stop.photos?.length && <div className="travel-photos" role="region" aria-label={`Photos from ${stop.place}`} tabIndex={0}>{stop.photos.map(photo => <figure key={photo.src}><img src={photo.src} alt={photo.alt} width="960" height="640" loading="lazy" decoding="async" />{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div>}
            </div>
          </article>
        </li>;
      })}
    </ol>
  </section>;
}
