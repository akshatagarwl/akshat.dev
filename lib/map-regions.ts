export type MapRegionId = 'taiwan' | 'bali' | 'siquijor';
type Bounds = [number, number, number, number];
export type MapRegion = {
  id: MapRegionId;
  label: string;
  archive: string;
  archiveKey: string;
  archiveMaxZoom: number;
  poster: string;
  posterAlt: string;
  bounds: Bounds;
  maxBounds: Bounds;
  minZoom: number;
};

const tripRegions = new Map<string, MapRegionId>([
  ['taiwan', 'taiwan'], ['bali', 'bali'], ['siquijor', 'siquijor'],
]);

export function getMapRegion(tripId: string, explicit?: MapRegionId): MapRegion {
  return mapRegions[explicit ?? tripRegions.get(tripId) ?? 'taiwan'];
}

export const mapRegions: Record<MapRegionId, MapRegion> = {
  taiwan: {
    id: 'taiwan', label: 'Taiwan', archive: '/maps/taiwan.pmtiles', archiveKey: 'taiwan.pmtiles',
    poster: '/maps/taiwan-overview.webp',
    posterAlt: 'OpenStreetMap basemap of Taiwan and its surrounding coast.',
    bounds: [119.5, 21.7, 122.3, 25.4], maxBounds: [117, 20, 125, 27], minZoom: 5.7,
    archiveMaxZoom: 9,
  },
  bali: {
    id: 'bali', label: 'Bali', archive: '/maps/bali.pmtiles', archiveKey: 'bali.pmtiles',
    poster: '/maps/bali-overview.webp',
    posterAlt: 'OpenStreetMap basemap of Bali and its surrounding coast.',
    bounds: [114.4, -8.95, 115.75, -8.05], maxBounds: [114, -9.4, 116.2, -7.6], minZoom: 7,
    archiveMaxZoom: 9,
  },
  siquijor: {
    id: 'siquijor', label: 'Siquijor', archive: '/maps/siquijor.pmtiles', archiveKey: 'siquijor.pmtiles',
    poster: '/maps/siquijor-overview.webp',
    posterAlt: 'OpenStreetMap basemap of Siquijor and its surrounding coast.',
    bounds: [123.4, 9.05, 123.76, 9.3], maxBounds: [123.35, 8.95, 123.85, 9.4], minZoom: 9,
    archiveMaxZoom: 12,
  },
};
