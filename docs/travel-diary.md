# Travel photo diaries

Current direction: **map-first, Three.js, light and quiet**. The map is the main highlight on both the homepage trip preview and the wide trip page. Select photo markers to explore a place and open its photographs; the full readable journal follows below. Optional owner-written notes belong next to the photos. Never invent journeys, dates, diary prose or photographs.

## Interaction

- `/travels` collects map-led previews; `/travels/[trip]` opens the large map. The homepage gets a map only once real, reviewed content exists.
- The map occupies most of the first viewport. A small selected-place card and thumbnail markers lead into the native photo viewer. Full-composition photographs remain below, readable without opening the modal. No sticky panels cover reading/focus on mobile or desktop.
- Map points are approximate place centres, **not captured GPS locations**. No route is drawn without an actual, owner-approved route. Stop numbers are ordering, not invented travel days.
- Three.js 0.187.0, official OrbitControls and SVGLoader provide the WebGL scene. D3 only projects geography. Drag to orbit; right-drag to pan. Focus the map: arrows pan and Shift-arrows orbit. Native zoom/fit buttons work with keyboard and touch. Wheel/touch scroll the document; browser pinch zoom is preserved.
- Raised land is a **cartographic silhouette, not actual terrain/elevation**. No invented mountains or tracks. The camera never automatically flies/rotates. IntersectionObserver can highlight the journal stop, but cannot move the camera.
- Render only on changes/resize, never in an idle animation loop. Cap pixel ratio at 2. Dispose the renderer/context, controls/key listeners, geometry/materials, ResizeObserver and scheduled frame on unmount or WebGL loss. Losing WebGL restores the SVG and native photo links. Reduced motion stays static until explicit interaction.
- Photo links progressively enhance into a native modal: previous/next, arrow keys, Escape and native focus return. Without JS they open the image normally. All photographs, places and captions remain readable without JS/Canvas.
- The first prototype uses a self-hosted SVG Taiwan basemap, not remote tiles, geolocation, account services or map APIs. Other regions need an appropriate basemap before authoring trips there.

## Private local previews

**A prototype is not publication approval.** Real draft records and media stay ignored in `.generated/travel-draft/`. Nothing is pushed or deployed until the owner reviews the content and approves publication.

Prepare a photo without altering its original:

```sh
node scripts/import-travel-photo.mjs /path/to/photo.jpg your-photo-slug
```

This creates 640/1280/1800px WebP copies in `.generated/travel-draft/media/`, bakes orientation into pixels, and removes EXIF/IPTC/XMP. It does **not** remove faces, signs or private information visible in pixels. Review every photograph visually. Original filenames, camera/device metadata, precise coordinates and exact timestamps do not belong in public records.

Place draft trip records in `.generated/travel-draft/trips.json`, using the `Trip` shape in `lib/trips.ts`:

- `id`, `title`, `month` (`YYYY-MM`), `draft: true`, `cover` and ordered `stops`.
- A photo has `id`, `src`, descriptive `alt`, pixel `width`/`height`, optional factual `caption`.
- Preview photo `src`: `/travels/preview/<trip-id>/<photo-slug>-1800.webp`.
- A stop has `id`, `place`, `photos`, optional owner-written `note`, approximate `[longitude, latitude]` and optional `locationNote` for review.
- The cover must be one of the trip's photographs. Duplicate slugs, remote/traversing paths, malformed months, invalid dimensions or invalid coordinates fail validation.

```sh
bun run preview:travel
# http://127.0.0.1:4321/travels
bun run test:travel-preview
```

The preview build is explicit (`TRAVEL_PREVIEW=1`), marked noindex and refuses CI. It moves its export to `.generated/travel-export`, **not production `out/`**, and only the explicit local preview server serves that directory. Generated staging copies in `public/travels/preview/` are ignored. `assert-publishable.ts` refuses private or missing production exports. A normal build removes preview staging copies, prepares only approved records and emits no draft routes/media. Do not bypass the publication guard or upload `.generated/` manually.

## Approve a trip

After owner review, move only approved, sanitized derivatives into `public/travels/<trip-id>/`. Add the reviewed record to `data/trips.json` with corresponding non-preview paths and no draft flag. Confirm month, place names, coarse marker positions, captions and visible people/private details. Do not infer an itinerary from gaps between photo timestamps or draw a line that purports to be a recorded route.

`data/trips.json` starts empty. No empty gallery or travel heading is shown. `page.trips.tsx` travel routes are enabled through `pageExtensions` only when approved trips (or an explicit private preview) exist, because Next static export cannot generate a dynamic route with zero parameters. Only approved trips enter the sitemap.

Run `bun run check`, `bun run build`, `bun run test`, and the publication guard. Deployment/pushing master still requires explicit approval.

The earlier abstract roadside diary remains as a legacy fallback for `data/travels.json` and its isolated test fixture; it is not shown alongside the new trip gallery. It does not represent a geographical itinerary.

## Map provenance

Natural Earth 1:50m admin-0 country data is public domain. Source revision: `ca96624a56bd078437bca8184e78163e5039ad19`. The checked-in projected paths are about 27KB, including a wider surrounding coastline so the 3D scene does not show artificial country cutoffs. No global GeoJSON payload reaches the browser.

Regenerate after downloading the pinned source into `.generated/travel-map/countries.geojson`:

```sh
mkdir -p .generated/travel-map
curl --fail --location https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_admin_0_countries.geojson --output .generated/travel-map/countries.geojson
bun scripts/render-taiwan-map.ts
```

Projection: pinned D3 geography, ISC notices retained in `public/licenses/d3-*.txt`. Rendering/interaction: pinned Three.js with its official MIT OrbitControls/SVGLoader, notice in `public/licenses/three.txt`. Natural Earth notice: `public/licenses/natural-earth.txt`. Seedbed/Lucide provenance remains intact. Travel photographs are owner-supplied personal content, not relicensed as part of the site's code or the public-domain map data.
