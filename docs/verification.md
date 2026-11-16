# Local verification — map-only existing components, 2026-11-16

**Not pushed or deployed. Production is unchanged.** No TV/phone contact, permission grant, current-location request or modification of originals.

## Checks

- Content/route type generation, TypeScript, normal production build, Seedbed/legacy/trip validation and real calendar dates.
- **28 original desktop/mobile Chromium tests** preserve projects, reading links, agent notes, flowers, metadata, redirects, headers and real 404 behavior.
- **32 private-preview desktop/mobile Chromium tests** cover actual MapLibre controls/rendering/popups, dated media, native scrolling, photo modal/navigation/accessibility, video playback, recorded GPS, Range streaming and publication isolation.
- Normal publication guard passes; private exports and oversized static assets are refused. Normal and private builds run sequentially, never concurrently.

## Existing map components

Homepage/travel previews and trip pages use maintained react-map-gl/MapLibre Map, Marker, Popup, NavigationControl, ScaleControl and standard Source/Layer components with Protomaps light cartography. No custom Three.js/SVG geography, separate journal, projection, terrain, camera controller or render loop remains. Dates are factual; missing days remain month-only. No invented itinerary, prose, footage or route.

Native photo dialogs retain previous/next, arrows, Escape, disabled-button focus handling and focus return. Modified clicks and unsupported-dialog navigation remain native. Existing automated map/photo WCAG A/AA/2.2 scans pass; no horizontal overflow at 320/390/768/1440 CSS pixels. Native wheel/one-finger touch scrolling and browser pinch are preserved.

No-JS, aborted archive loading and real WebGL context loss retain the generic existing-renderer poster and dated native media links. The poster contains no personal pins/photos/dates. Standard library components own interaction/rendering/lifecycle. There are no automatic camera rides.

## Video quality and recorded position

The earlier 20MB/720p/24fps clip was too compressed for moving vegetation. Its replacement is complete **1920×1080, 30000/1001 fps, approximately 14Mbps**, about 310MB decimal, with source AAC audio copied. The original remains untouched. The importer now defaults to quality rather than a static-upload budget; compact encoding requires an explicit flag.

GPS/device/exact timestamp/timecode tags and telemetry/data tracks are absent from the playback MP4. Standard codec/container fields remain. Its WebP poster has no EXIF/IPTC/XMP. Real muted playback via native keyboard controls decodes frames in desktop/mobile-emulated Chromium. No MP4 request occurs before deliberate playback in these tests. Closing/Escape pauses, detaches/unmounts the source and returns focus.

At the owner's explicit request, 174 valid camera GPS samples were separately extracted to ignored relative-time data. The coastal bikeway identification was checked against an official route and visible footage, not guessed from palms alone. The exact track remains unpublished and requires separate publication review. Other photo stops retain approximate centres, including one provisional place name.

The native player is a small in-map panel, keeping the map visible/interactive rather than covering it with a modal. Opening deliberately fits the recorded extent, accounting for the actual panel/caption. Native playback and seeking update a standard Marker; Source/Layer draw only the recorded line. Paused/seeking positions are tested against the supplied samples. Playback never moves the camera. Closing restores the previous view. Tests replace browser geolocation methods with throwing stubs: neither is called. Unknown fixes/gaps are not bridged or extrapolated into a fabricated route.

High-quality private videos use a loopback-only server with pinned MIT sirv, not Cloudflare's size-limited static upload path. HTTP 206/Content-Range and 1024-byte partial responses are verified. Same-origin CSP/privacy headers and noindex are retained; CI and non-loopback Host/Origin values are rejected. Encoded retina sprite paths work in both local and production-style hosting. Production deployment is unchanged; large videos need separately approved media hosting, not silent quality degradation.

## Privacy and provenance

All visitor map resources are same-origin: regional 3.8MB PMTiles archive, existing style, local glyphs/sprites and standalone worker. Official PMTiles FileSource also works on hosts without Range support. No map tokens, vendor accounts, runtime remote tiles/fonts, analytics, browser location or permission prompts. BSD/MIT, Noto OFL, OpenStreetMap ODbL and ESA WorldCover CC BY 4.0 notices and visible attribution remain; see `public/maps/README.md` and `public/licenses/`.

Real records, exported originals, sanitized derivatives and GPS sidecars remain ignored. Explicit private builds are noindex, refuse CI and export only to `.generated/travel-export`, never production `out/`. Normal builds omit all private routes/records/media. Approved `data/trips.json` stays empty. Publication requires owner review and explicit approval, including any precise track and media hosting. Personal media/GPS are not licensed as code or map data.

## Limits

No physical iOS/Safari/WebKit, screen-reader user testing, GPU/battery profiling, universal frame-rate certification, Lighthouse or production rollout verification. Mobile results are Chromium emulation. Full-clip privacy, visible bystanders, audio rights and captions/transcript still require owner review. A working native player is not a claim of caption-complete accessibility; no empty/fake caption track was added.
