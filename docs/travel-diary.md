# Travel maps

Current owner direction: **add dates, keep only the map, reuse existing map components**. The earlier custom Three.js map and separate journal have been removed. Never invent journeys, dates, diary prose or photographs.

## Existing components, not a custom map

- **react-map-gl 8.1.3** composes MapLibre's Map, Marker, Popup, NavigationControl and ScaleControl. **MapLibre GL 6.18.0** owns rendering, interaction, resource cleanup and reduced-motion behavior. There is no site-built renderer, projection, terrain, orbit controller or animation loop.
- **Protomaps basemaps 5.7.2** supplies the existing light cartography. Labels are localized to English using upstream English/Latin names; no invented labels. **PMTiles 4.5.0** reads the self-hosted regional archive through its official FileSource.
- `/travels`, homepage previews and `/travels/[trip]` are map-only. A small map caption shows the month; photo markers and standard library popups show the factual stop date when supplied. Dates without a known day remain month-only. No separate journal, timeline, route, sidebar or fabricated travel-day numbers.
- Approximate place centres are **not captured GPS**. Do not add a route without an owner-approved source. The photo viewer preserves native dialog modality, arrow navigation, Escape, modified-click image links and focus return.
- Standard zoom/pan/keyboard controls and fit are available. No wheel zoom, touch pinch interception or automatic camera travel. Cooperative gestures preserve single-finger page scrolling. No appearance preference storage or geolocation.
- A generic poster rendered by the same map library and a native “Photos and dates” disclosure remain usable without JS or when the archive cannot load. The poster contains no personal pins, photographs or dates.
- All visitor map resources are same-origin: regional tiles, worker, style, fonts and sprites. No map vendor account, token, remote tile/font request, telemetry or permission prompt. The full archive is fetched once per page/module (about 3.8MB), avoiding a Range-request requirement on assets-only hosting. Source geometry is cached through the existing PMTiles reader; higher zoom overzooms its z9 data rather than fabricating detail.

## Private local previews

**A prototype is not publication approval.** Real draft records/media stay ignored in `.generated/travel-draft/`. Nothing is pushed or deployed until the owner reviews the content and approves publication.

```sh
node scripts/import-travel-photo.mjs /path/to/photo.jpg your-photo-slug
```

Creates 640/1280/1800px WebPs in `.generated/travel-draft/media/`, bakes orientation into pixels, removes EXIF/IPTC/XMP and leaves originals unchanged. This does **not** remove visible faces, signs or private information. Original source filenames, precise GPS, device identity and exact timestamps do not belong in public records. Owner-requested date-only values must remain factual and separately reviewed before publication.

Draft `.generated/travel-draft/trips.json` uses `Trip` in `lib/trips.ts`:

- Trip: `id`, `title`, `month` (`YYYY-MM`), `draft: true`, `cover`, ordered `stops`.
- Stop: `id`, `place`, `photos`, optional real `date` (`YYYY-MM-DD`), approximate `location: [longitude, latitude]`, optional `locationNote`/owner-written `note` retained as data. The current map-only UI does not invent/display a diary.
- Photo: `id`, `src`, descriptive `alt`, pixel `width`/`height`, optional factual `caption`.
- Preview source: `/travels/preview/<trip-id>/<photo-slug>-1800.webp`.
- Duplicate IDs, remote/traversing image paths, invalid months/calendar dates/dimensions/coordinates and a cover outside the trip fail validation.

```sh
bun run preview:travel       # loopback only, port 4321
bun run test:travel-preview  # separate port 4323; don't run alongside normal tests/builds
```

Explicit `TRAVEL_PREVIEW=1` is noindex and refuses CI. Its export moves to `.generated/travel-export`, **never production `out/`**. Staging `public/travels/preview/` is ignored. The publication guard refuses preview/missing production exports. Normal builds remove preview staging and include only approved records. Never bypass the guard or upload `.generated/`.

## Review and publication

Review visible privacy details, exact dates, place names, approximate centres and captions. A gap between photographs is not an itinerary or a route. Move only approved sanitized derivatives to `public/travels/<trip-id>/`, then add reviewed records to `data/trips.json` with non-preview paths and no draft flag.

Approved records initially remain empty; no gallery/heading/travel routes appear in production. `page.trips.tsx` extensions enable only with real approved trips or explicit private previews, avoiding zero-parameter static dynamic routes. Only approved trips enter the sitemap.

Run check, normal build/tests and the publication guard. Deployment/pushing master requires explicit approval. The older abstract roadside fixture remains an isolated legacy fallback, never a simultaneous travel section.

## Provenance and reproduction

See [`public/maps/README.md`](../public/maps/README.md) for the pinned upstream asset source, regional extraction, checksums and licenses. `bun scripts/prepare-map-assets.ts` regenerates the existing localized upstream style, downloads the pinned glyphs/sprites and copies the installed worker. Checked-in map assets make ordinary builds offline with respect to map vendors.

Personal photographs/videos are not licensed as site code or map data. Seedbed/Lucide provenance is unchanged.
