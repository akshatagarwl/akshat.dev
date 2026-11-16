# Local verification — map-only existing components, 2026-11-16

**Not pushed or deployed. Production is unchanged.** No TV/phone contact, account API, permission grant or modification of owner-supplied originals.

## Checks

- Frozen dependency install, content/route type generation, TypeScript, production build, Seedbed/legacy fixture/trip validation tests, including real date-only calendar validation.
- **28 original desktop/mobile Chromium tests** preserve all existing projects, reading links, notes, flowers, metadata, redirects, headers and 404 behavior.
- **28 private-preview desktop/mobile Chromium tests** exercise actual MapLibre rendering, standard controls/popups, factual date labels, keyboard pan, fit, native wheel and one-finger touch scrolling, image navigation and the native modal.
- Production dependency audit: no reported vulnerabilities. Normal publication guard passes; private exports are refused.

## Map only, no custom map engine

The custom Three.js/SVG map and separate journal have been removed. Homepage/travel previews and trip pages use maintained **react-map-gl + MapLibre** Map/Marker/Popup/NavigationControl/ScaleControl components and **Protomaps light** cartography. Dates appear on pins and standard popups; unknown days remain month-only. Approximate place centres are not captured GPS or recorded routes. No invented dates, itinerary, prose, terrain, footage or route.

The large map occupies more than half the viewport. Map/image links preserve modified clicks. Native modal previous/next, arrow keys, Escape and focus return work, including a navigation button becoming disabled at an end. Missing dialog support preserves ordinary image navigation.

No-JS keeps the generic map poster and dated native image links. An aborted archive request and deliberately lost **real WebGL context** each restore the poster; the lost canvas is removed. There is no site-owned render loop or camera controller. The maintained library owns rendering and lifecycle; no automatic camera rides.

Standard controls and popup/modal UI pass automated WCAG A/AA/2.2 scans in local Chromium. No horizontal overflow at 320, 390, 768 or 1440 CSS pixels. No off-origin visitor requests, failed resources or page errors in the normal map flow. High-DPR emulation loads local retina sprites using canonical encoded URLs, avoiding static-host redirects.

## Privacy and provenance

All map resources are same-origin: regional 3.8MB PMTiles archive, existing style, glyphs, sprites and standalone module worker. The official PMTiles FileSource supports assets-only hosting without HTTP Range requests. There are no map tokens, accounts, remote tiles/fonts, geolocation or permission prompts. Licenses include BSD/MIT, Noto OFL, OpenStreetMap ODbL and ESA WorldCover CC BY 4.0. Visible attribution and full source/license details are retained in `public/maps/README.md` and `public/licenses/`.

The generic map poster was visually reviewed: no personal pins, photographs or dates. Personal travel images are not licensed as site code or map data.

Real drafts/media stay ignored. Explicit private previews are noindex, refuse CI, bind to loopback and export only to `.generated/travel-export`; production `out/` is absent. Normal builds omit private routes/records/media even when local drafts exist. Approved `data/trips.json` remains empty. Publication requires owner review and explicit approval.

All six photo derivatives remain free of EXIF/IPTC/XMP. Visible bystanders/private details still require manual review. Requested date-only values were read from owner-supplied originals; full timestamps, captured GPS, source filenames and camera/device metadata are not exported. One coarse place name remains provisional.

## Limits

No physical phone, Safari/WebKit, screen-reader user testing, GPU/battery profiling, universal frame-rate guarantee, Lighthouse or production rollout verification. Mobile checks are Chromium device emulation, not physical iOS. The owner-requested video was exported through Photos without modifying its original. Its full-length 720p H.264/AAC derivative is about 20MB, with GPS, exact timestamps, timecode and GoPro telemetry/data tracks removed. Standard codec/container fields remain. Real muted playback decodes frames in desktop/mobile-emulated Chromium; there is no MP4 request before deliberate playback. Closing/Escape pauses and removes the player and returns focus. The poster and records/media remain ignored and unpublished. The new pin uses a provisional, approximate coastal-region centre, not captured GPS.

Video audio, captions/transcript, visible bystanders and the complete clip still need owner review before publication. The native player preserves source audio and does not autoplay. Existing automated accessibility checks cover map/photo UI, not a claim of caption-complete video accessibility. No empty/fabricated caption track has been added.
