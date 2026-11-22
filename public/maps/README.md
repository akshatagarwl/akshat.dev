# Self-hosted, existing map components

This directory contains public basemap resources only. No personal trips, dates, photographs, captured GPS, vendor token or account code.

## Implementations and licenses

- react-map-gl **8.1.3** (MIT): https://visgl.github.io/react-map-gl/ — standard React Map/Marker/Popup/NavigationControl/ScaleControl components.
- MapLibre GL JS **6.18.0** (BSD-3-Clause): https://maplibre.org/maplibre-gl-js/docs/ — renderer, interaction, lifecycle and copied module worker.
- PMTiles **4.5.0** (BSD-3-Clause implementation; CC0 specification): https://docs.protomaps.com/pmtiles/ — official FileSource avoids requiring HTTP Range support from static hosting.
- @protomaps/basemaps **5.7.2** (BSD-3-Clause, plus included upstream style/icon notices): existing light style. Site adjustment: English/Latin name labels only, retaining the upstream cartography.
- OpenStreetMap-derived data: **ODbL**, © OpenStreetMap contributors, https://www.openstreetmap.org/copyright . This extracted archive is provided directly for download at `/maps/taiwan.pmtiles` under its source data terms, not the site-code MIT license.
- Landcover: **ESA WorldCover / Daylight, CC BY 4.0**, https://esa-worldcover.org/en/data-access and https://creativecommons.org/licenses/by/4.0/ . Map attribution includes this source. Natural Earth inputs are public domain; Mapzen icons are MIT. Full upstream data notices: `/licenses/protomaps-data.txt`.
- Noto Sans Regular/Medium/Italic glyphs: **SIL OFL 1.1**, `/licenses/noto-map-fonts.txt`.

All notices are retained under `/licenses/`. Protomaps basemap/data license copies came from source revision `42ffaaa4a85a41bfcb23e43cc0f5b492a5eca123`; PMTiles license from `aec8fa1341222fdddb3318e9ffa8e18e19b312f7`. MapLibre/react-map-gl notices come from the exact installed packages. These revisions identify license texts; dependencies themselves are pinned in the lockfile.

## Regional archive

Source: https://build.protomaps.com/20261115.pmtiles . A rectangular regional subset (117°E,20°N to 125°E,27°N), zooms 0–9; no edits to source features. Higher display zooms overzoom these vectors, not additional observed detail.

```sh
pmtiles extract https://build.protomaps.com/20261115.pmtiles public/maps/taiwan.pmtiles --bbox=117,20,125,27 --maxzoom=9
pmtiles verify public/maps/taiwan.pmtiles
```

Archive: 3,936,946 bytes; SHA-256 `35f617a44ae3d34246b00d7f7bb10a631de78cce4493c21e13c1927fc4553cc4`.

The installed CLI reports `pmtiles dev, commit none, built at unknown`; the checked-in archive/hash, source date and extraction parameters identify the actual artifact rather than claiming a versioned CLI build.

## Bali regional archive

Source: https://build.protomaps.com/20261116.pmtiles (listed at https://maps.protomaps.com/builds/). An unmodified rectangular subset of Bali and surrounding water, zooms 0–9, under the same data licenses and attribution above. Download: `/maps/bali.pmtiles`.

```sh
pmtiles extract https://build.protomaps.com/20261116.pmtiles public/maps/bali.pmtiles --bbox=114.4,-8.95,115.75,-8.05 --maxzoom=9
pmtiles verify public/maps/bali.pmtiles
```

Archive: 658,133 bytes; SHA-256 `7e0f82320e3e4af5349c14aed23a494d59a0af32bdf7b6cf89729d31998be5db`.

Regional configuration is in `lib/map-regions.ts`. Each region uses separate archive/cache keys; no personal coordinates or photographs belong in these public basemap assets. Each region loads its archive only when its map becomes visible. With just one recorded photo pin, fitting retains the island overview rather than zooming into a single point.

## Siquijor regional archive

Source: https://build.protomaps.com/20261116.pmtiles . An unmodified regional subset of Siquijor and surrounding water through zoom 12, under the same data licenses and attribution above. Download: `/maps/siquijor.pmtiles`.

```sh
pmtiles extract https://build.protomaps.com/20261116.pmtiles public/maps/siquijor.pmtiles --bbox=123.35,8.95,123.85,9.4 --maxzoom=12
pmtiles verify public/maps/siquijor.pmtiles
```

Archive: 824,113 bytes; SHA-256 `f1ef0d903def24ded58d779acc964b2d606eb5b0f773a35aedabd4ff8ee2d049`. `MAP_REGION=siquijor` renders its generic fallback poster without personal records. The region's source maximum zoom is configured explicitly; higher display zooms overzoom the available vectors.

## Styles, glyphs, sprites and worker

Protomaps assets source revision: **`028c18f713baecad011301ff7a69acc39bcc2ae7`**, https://github.com/protomaps/basemaps-assets . Only the first four Latin glyph ranges for the three named fonts and existing v4 light sprite assets are copied. Non-English names without English/Latin alternatives are omitted, not invented or fetched remotely.

```sh
bun scripts/prepare-map-assets.ts
```

This regenerates `data/map-style.json`, downloads pinned glyphs/sprites, and copies the installed standalone `maplibre-gl-worker.mjs`. Worker SHA-256: `c8998a2616612ebc7afc3a6f83e31ad1c5f6187550a018b4fd0561779c33015b`.

Ordinary builds require no map-vendor requests. Browsers fetch only same-origin files, with one complete ~3.8MB archive fetch per page/module; no remote tiles, fonts, geolocation, permissions or map tokens.

## Static fallback

`taiwan-overview.webp` is a generic map render from this same library/style/archive, with map attribution and **no personal photo pins or dates**. To reproduce while a local map preview runs:

```sh
PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/render-map-poster.mjs
```

The script creates a separate native MapLibre map using only the configured region bounds and basemap assets. It never loads personal trip records, pins, dates, photographs or camera positions, and strips metadata via Sharp. To render Bali instead, set `MAP_REGION=bali`; `MAP_PREVIEW_URL` may point at any loopback-only local asset server. Visually review the resulting poster before committing it. Personal travel photographs are never covered by these map or code licenses.
