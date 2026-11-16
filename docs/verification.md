# Local verification — map-first Three.js prototype, 2026-11-16

This prototype has **not been pushed or deployed**. Production is unchanged. No TV/phone contact, account API, Photos-library modification or permission grant. Owner-supplied originals were read, not changed.

## Checks

- Frozen dependency install, production dependency audit, content/route type generation and TypeScript.
- Normal production build, Seedbed/legacy diary/trip validation tests and **28 original desktop/mobile Chromium browser tests**.
- **26 private-preview desktop/mobile Chromium tests**, including actual Three.js rendering and interactive camera controls, rather than a mocked map.
- A normal build with local private drafts present still excludes their records, travel routes and preview media. Private builds stay outside production `out/`; the publication guard rejects them.

## Map-first experience

Both the homepage trip preview and wide trip page lead with the map, not a photo cover or a diary/sidebar layout. The trip map takes more than half the viewport; the full photo journal follows below it. Three.js 0.187.0 renders the Natural Earth silhouette, surrounding coast, sea and photo pins. Raised land is a cartographic style, **not measured elevation or invented mountains**.

Verified: mouse orbit, keyboard orbit/pan, bounded zoom and fit, marker selection without leaving the map, selected-place photo opening and native modal focus return. Wheel and CDP-emulated touch gestures over the real canvas scroll the document rather than hijacking it. Photo-journal reading can update the selected place without moving the camera. There are no automatic camera rides or motion-dependent reading features.

The renderer sleeps when idle: its render counter remains unchanged after settling. It schedules frames only for interactions/resize, caps pixel ratio at 2 and disposes controls/listeners, geometry/materials, observers and the WebGL context. A test deliberately loses the actual context and verifies canvas removal, disabled unavailable controls, visible SVG fallback and working native place links.

No-JS pages retain the map, place links and complete photographs. Unsupported native dialogs retain ordinary image links. Modified clicks open new tabs normally. The photo viewer supports previous/next, arrow keys, Escape, inert background and focus return, including when a navigation button becomes disabled at an end.

Gallery, diary and open modal pass automated WCAG A/AA/2.2 scans. No horizontal overflow at 320, 390, 768 or 1440 CSS pixels. Desktop/mobile screenshots are generated under ignored `test-results/`; representative views reviewed. No off-origin requests or browser page errors.

## Privacy and provenance

Real draft records/media stay ignored in `.generated/travel-draft/`. Only explicit local previews stage derivatives under ignored `public/travels/preview/`, mark the pages noindex, refuse CI and isolate the export in `.generated/travel-export`. Production `out/` is absent after a preview build. The server binds only to loopback.

Six 640/1280/1800px photo derivatives pass metadata checks: no EXIF, IPTC or XMP, including captured GPS, device identity and exact timestamps. This does not remove visible bystanders/private details. Owner visual review/publication approval are still required. Derived monthly dates and approximate place markers are not a recorded route; one metadata-derived place name remains provisional. No diary prose, footage or full itinerary has been invented.

Approved `data/trips.json` is empty. Only approved records enter production/sitemap. Three.js's MIT notice is retained; D3 projection and legacy ISC notices remain. Natural Earth is public domain, with pinned source provenance and a reproducible local projection script. Personal photographs are not covered by the code license.

## Preserved behavior and limits

Eight projects, two complete agent notes, sixteen reading links (ten under native disclosure), `/tv`, `/qin`, `/links → /#links`, canonical/sitemap/robots, security headers and real 404s remain tested. Plain wordmark/links, light-only appearance and all flower fallbacks remain. No analytics, remote fonts, remote tiles, appearance selectors or preference storage.

Not verified: physical phones, Safari/WebKit, screen-reader user testing, GPU/battery cost, universal frame rates, production rollout or Lighthouse. The video original is still unavailable locally and is not represented as playable content. Local Chromium screenshots/tests are not a claim of physical-device or production verification.
