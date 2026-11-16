# Local verification — travel photo diary prototype, 2026-11-16

This prototype has **not been pushed or deployed**. The existing production site is unchanged. No TV/phone contact, account API, Photos-library modification or permission grant was performed. Original owner-supplied photographs were read, not changed.

## Passing checks

- Frozen dependency install; production audit reports no known vulnerabilities across 70 packages (not a complete security audit).
- `bun run check`: trusted content preparation, route generation and TypeScript.
- Normal `bun run build`: notes, Seedbed/legacy diary/trip tests, production compilation and static export.
- `bun run test`: **28 desktop/mobile Chromium tests**, including the original routes/content, native reading disclosure, light-only appearance, flower lifecycle/fallbacks, legacy roadside fixture, keyboard/touch and WCAG A/AA/2.2 scans.
- `bun run test:travel-preview`: **22 additional desktop/mobile Chromium tests** against the explicit, isolated local draft export.
- Default production export passes the publication guard; legacy-path Wrangler dry-run validates **80 static files** without uploading anything.

## Travel prototype

The cover gallery links into the photo diary. The local draft has real owner-supplied photographs, derived month-level dates, an explicitly approximate metadata-derived place awaiting confirmation, and an owner-named place. No diary prose, route, exact-day timeline or footage has been invented.

Verified: bounded D3 pan/zoom and fit; native mouse-wheel and CDP-emulated touch scrolling over the map; reading forward/back updates its active place; native anchor navigation; full-composition photos; responsive images; no off-origin requests or browser page errors.

The native photo modal supports previous/next, arrow keys, Escape, background inertness and focus return. Reaching an end disables the navigation button; focus moves to the persistent close button so subsequent keyboard navigation still works. Browser chrome may remain tabbable, as expected for native dialogs.

Without JS, the map, places, captions and photographs remain readable; native photo links remain useful and unavailable zoom controls are disabled. Modified clicks open images in a new tab normally; browsers without native dialog support also retain the original image link. Reduced motion removes desktop map pinning and automatic camera movement. Mobile uses a nonsticky map that cannot cover photographs or focused content.

Gallery, diary and open modal pass automated WCAG A/AA/2.2 checks. No horizontal overflow at 320, 390, 768 or 1440 CSS pixels. Desktop/mobile screenshots are generated under ignored `test-results/`; representative images reviewed.

## Privacy/publication isolation

- Six generated 640/1280/1800px WebP derivatives are checked through Sharp and independently inspected with ExifTool: no EXIF, IPTC or XMP, including captured GPS, device identity and capture timestamps.
- Real source records and media remain ignored in `.generated/travel-draft/`; generated staging copies under `public/travels/preview/` are also ignored.
- Explicit private builds are noindex, refuse CI and move their export to `.generated/travel-export`, leaving production `out/` absent. Only the explicitly configured loopback preview server serves them. The publication guard rejects this state.
- A normal build with the same private draft inputs present produces an empty approved trip collection, no travel routes, no preview media and no draft staging directory. Browser checks require 404 for `/travels`, the unpublished trip and its private photo path.
- Only reviewed `data/trips.json` records enter production and the sitemap. Approved data remains empty.
- Natural Earth paths are self-hosted public-domain data. D3/Seedbed/Lucide notices remain available. Travel photographs are not relicensed under the site's code license.

## Preserved behavior and limits

Eight projects, two complete agent notes, sixteen reading links (ten under a native disclosure), `/tv`, `/qin`, `/links → /#links`, canonicals, sitemap/robots, security headers and actual 404 responses pass. Wordmark and links remain free of decorative leaf/arrows. No theme selectors, preference storage, analytics, remote fonts or remote map tiles.

Not verified: physical phones, Safari/WebKit, screen-reader user testing, universal 60fps, battery/GPU cost, new-feature production rollout or Lighthouse. The video original is not locally available and is not represented as playable media. Photo metadata removal does not remove visible bystanders/private details; owner visual review and publication approval remain required. The full itinerary and the metadata-derived place name still need owner confirmation.
