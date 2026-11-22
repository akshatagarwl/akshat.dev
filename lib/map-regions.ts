export type MapRegionId = 'taiwan' | 'bali';
type Bounds = [number, number, number, number];
export type MapRegion = {
  id: MapRegionId;
  label: string;
  archive: string;
  archiveKey: string;
  poster: string;
  posterAlt: string;
  bounds: Bounds;
  maxBounds: Bounds;
  minZoom: number;
};

export function getMapRegion(tripId: string, explicit?: MapRegionId): MapRegion {
  return mapRegions[explicit ?? (tripId === 'bali' ? 'bali' : 'taiwan')];
}

export const mapRegions: Record<MapRegionId, MapRegion> = {
  taiwan: {
    id: 'taiwan', label: 'Taiwan', archive: '/maps/taiwan.pmtiles', archiveKey: 'taiwan.pmtiles',
    poster: '/maps/taiwan-overview.webp',
    posterAlt: 'OpenStreetMap basemap of Taiwan and its surrounding coast.',
    bounds: [119.5, 21.7, 122.3, 25.4], maxBounds: [117, 20, 125, 27], minZoom: 5.7,
  },
  bali: {
    id: 'bali', label: 'Bali', archive: '/maps/bali.pmtiles', archiveKey: 'bali.pmtiles',
    poster: '/maps/bali-overview.webp',
    posterAlt: 'OpenStreetMap basemap of Bali and its surrounding coast.',
    bounds: [114.4, -8.95, 115.75, -8.05], maxBounds: [114, -9.4, 116.2, -7.6], minZoom: 7,
  },
};
