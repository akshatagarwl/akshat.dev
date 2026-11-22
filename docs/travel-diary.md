# Travel maps

Current owner direction: **add dates, keep only the map, reuse existing map components**. The earlier custom Three.js map and separate journal have been removed. Never invent journeys, dates, diary prose or photographs.

## Bali gallery

The owner approved publication of Bali's two reviewed photographs, exact photo dates and temple GPS pin. Approved records are in `data/trips.json`; sanitized responsive and full-resolution cropped copies are in `public/travels/bali/`. The gallery is `/travels/bali`. Ordinary builds include only approved records; ignored source exports, recovery copies and private drafts remain local.

- The temple portrait, dated 30 May 2026 in Photos, is cropped to remove the shoes; the Photos original and exported source copies remain untouched. Its recorded GPS is used with the owner's explicit permission. Reverse-geocoded OpenStreetMap data places it at the Gates of Heaven; Indonesia's official tourism site confirms Pura Penataran Agung Lempuyang in Tri Buana, Abang, Karangasem. The standard library popup shows only the temple name (Pura Penataran Agung Lempuyang), exact date and a link to the recorded point on OpenStreetMap; the full locality is not displayed.
- The mountain photograph, dated 27 May 2026 in Photos, is cropped from 1080×1920 to 1080×1700: a little excess sky is removed while the full original width, laptop screen and coffee foreground are retained. No rotation, perspective skew, mirroring, invented content or upscaling was needed. Neither its file nor Photos has a recorded location, so it has no inferred pin. Both photos retain factual alt text but no visible captions.
- Both use sanitized responsive WebPs and a sanitized original-resolution WebP in the existing native photo dialog. Source exports and private provenance remain ignored local assets; only the owner-approved sanitized photographs and recorded temple GPS are published. No photographs or captured GPS are stored in the public regional-map configuration.
- Bali and Taiwan use distinct self-hosted Protomaps archives and cache keys, with region-specific fit controls and generic fallback posters. Public basemap provenance is in `public/maps/README.md`.

## Existing components, not a custom map

- **react-map-gl 8.1.3** composes MapLibre's Map, Marker, Popup, NavigationControl and ScaleControl. **MapLibre GL 6.18.0** owns rendering, interaction, resource cleanup and reduced-motion behavior. There is no site-built renderer, projection, terrain, orbit controller or animation loop.
- **Protomaps basemaps 5.7.2** supplies the existing light cartography. Labels are localized to English using upstream English/Latin names; no invented labels. **PMTiles 4.5.0** reads the self-hosted regional archive through its official FileSource.
- The homepage has no travel map or media section. A native Gallery link in the site header leads to `/travels`; it is omitted when no trips exist. `/travels` and `/travels/[trip]` are map-only. A small map caption shows the month; photo markers and standard library popups show the factual stop date when supplied. Dates without a known day remain month-only. No separate journal, timeline, sidebar or fabricated travel-day numbers. Recorded video tracks are the explicit owner-requested exception to the no-route default; never infer a route between photographs.
- Approximate place centres are **not captured GPS**. Do not add a route without an owner-approved source. The photo viewer preserves native dialog modality, arrow navigation, Escape, modified-click image links and focus return.
- Standard zoom/pan/keyboard controls and fit are available. No wheel zoom, touch pinch interception or automatic camera travel. Cooperative gestures preserve single-finger page scrolling. No appearance preference storage or geolocation.
- A generic poster rendered by the same map library and a native “Photos and dates” disclosure remain usable without JS or when the archive cannot load. The poster contains no personal pins, photographs or dates.
- All visitor map resources are same-origin: regional tiles, worker, style, fonts and sprites. No map vendor account, token, remote tile/font request, telemetry or permission prompt. The full archive is fetched once per page/module (about 3.8MB), avoiding a Range-request requirement on assets-only hosting. Source geometry is cached through the existing PMTiles reader; higher zoom overzooms its z9 data rather than fabricating detail.

Deliberate location changes that pan or separate nearby pins animate for 650ms using Motion's cubic-bezier easing through MapLibre's native camera API. Fit Taiwan uses the same transition; initial fitting and playback-GPS framing stay immediate. MapLibre honors reduced motion (the animation is not essential). Opening media stops any in-flight selection transition, and browsing within the photo-origin dialog does not move the map underneath it. There is no second animation loop or automatic camera following.

Gallery maps share the site's 640px content column and its 24px mobile page margins; trip pages do not break out to viewport width. The polaroid strip scrolls horizontally within the map when its cards do not fit, on desktop as well as mobile.

Native media dialogs dismiss on the close control, Escape, or a click outside the dialog bounds—not inside its padding. The modal video area shrinks within the available viewport height so the header and previous/next controls stay visible in short landscape windows, without changing the original video source or quality.

Visible descriptions use the media's singular `caption` when supplied. An explicit `null` hides the description without removing the accessible photo alt/video title; an omitted caption falls back to the photo alt or video title. Plural video `captions` remains reserved for VTT subtitles. Taiwan uses the owner's selected wording, suppresses descriptions on the three videos and Hualien road photo, and labels the bridge ride Guosheng Bridge. The repair photo is cropped on the right to remove fingers; all published sizes, including the lossless full-resolution copy, use that crop. The ignored uncropped sanitized copy and camera originals remain untouched.

Photo-origin left/right navigation keeps the same native preview dialog open across both photos and videos; navigating to a video does not close it or switch to the map embed. Directly opening a video from a map pin/strip still uses the in-map player. Both contexts share chronological navigation, native controls and stop-on-close behavior.

Video playback uses pinned ReactPlayer 3.4.0 with native browser controls, inline playback, no autoplay and `preload="none"`. Published Taiwan videos now play the sanitized original-quality HEVC MP4 URLs directly from R2, without a lower-resolution fallback; no provider SDK, account, thumbnail service or analytics is required for these file URLs. Opening the player reserves its layout before the lazy player loads so the GPS marker stays visible. The native video ref preserves posters, accessible names, seeking and stop-on-close behavior. ReactPlayer is not a codec converter: HEVC decoding depends on the browser/device. Original-quality download links remain available if playback is unsupported. Lower-resolution video objects and private test fixtures are retained, not deleted, but are no longer referenced by the published trip's playback sources.

## Private local previews

**A prototype is not publication approval.** Real draft records/media stay ignored in `.generated/travel-draft/`. Nothing is pushed or deployed until the owner reviews the content and approves publication.

```sh
node scripts/import-travel-photo.mjs /path/to/photo.jpg your-photo-slug
```

Creates 640/1280/1800px WebPs in `.generated/travel-draft/media/`, bakes orientation into pixels, removes EXIF/IPTC/XMP and leaves originals unchanged. This does **not** remove visible faces, signs or private information. Original source filenames, precise GPS, device identity and exact timestamps do not belong in public records. Owner-requested date-only values must remain factual and separately reviewed before publication.

Draft `.generated/travel-draft/trips.json` uses `Trip` in `lib/trips.ts`:

- Trip: `id`, `title`, `month` (`YYYY-MM`), `draft: true`, `cover`, ordered `stops`.
- Stop: `id`, `place`, `photos`, optional real `date` (`YYYY-MM-DD`), legacy approximate `location: [longitude, latitude]`, optional `locationNote`/owner-written `note` retained as data. The current map-only UI does not invent/display a diary.
- Photo/video: optional owner-approved `gps: [longitude, latitude]`, copied without rounding from the source's embedded GPS. Each item gets its own standard MapLibre marker; stop centres are never substituted. Missing GPS means no pin, not a guessed nearby location.
- Photo: `id`, `src`, descriptive `alt`, pixel `width`/`height`, optional factual `caption`.
- Optional stop `videos`: each needs `id`, local MP4 `src`, WebP `poster`, factual `title`, pixel `width`/`height`, duration in seconds, optional local VTT `captions`, optional explicitly authorized recorded `track: [relativeSeconds, longitude, latitude][]`. A stop may have `photos: []` when it has videos. Video IDs share the trip media namespace.
- Preview source: `/travels/preview/<trip-id>/<photo-slug>-1800.webp`.
- Duplicate IDs, remote/traversing image paths, invalid months/calendar dates/dimensions/coordinates and a cover outside the trip fail validation.

```sh
bun run preview:travel       # loopback only, port 4321
bun run test:travel-preview  # separate port 4323; don't run alongside normal tests/builds
```

Explicit `TRAVEL_PREVIEW=1` is noindex and refuses CI. Its export moves to `.generated/travel-export`, **never production `out/`**. Staging `public/travels/preview/` is ignored. The publication guard refuses preview/missing production exports. Normal builds remove preview staging and include only approved records. Never bypass the guard or upload `.generated/`.

## Local video import

Export only the requested item from Photos using its scripting export command; this may take time while Photos obtains the original. Never change library/iCloud settings, grant permissions or edit the source asset. Keep exported originals under ignored `.generated/travel-draft/video-original/`.

```sh
node scripts/import-travel-video.mjs /path/to/video.mp4 your-video-slug
```

Requires local ffmpeg/ffprobe. Produces a complete, untrimmed H.264/AAC MP4, at most 1920×1080 at the source frame rate, and a WebP poster under ignored draft media. The macOS encoder uses VideoToolbox at 14Mbps; other systems use x264 CRF20. AAC source audio is copied when possible. Do not silently reduce quality to meet a static-file cap. Explicit stream mapping excludes telemetry/subtitles/data tracks; source GPS, camera/device tags, full timestamps and timecode are removed. Generic codec/container fields remain. Source audio is preserved, so privacy/audio/caption review is still necessary. Import refuses overwrites. Optional `--compact` deliberately opts into the earlier 720p/24fps/24MiB budget; it is not the default. `--finalize` validates/finalizes an existing derivative after an interrupted poster-generation step; it does not re-encode or modify originals.

The native player is a small overlay inside the map, not a modal hiding the map: browser controls, plays-inline, `preload="none"`, no autoplay. Local Chromium confirms no MP4 request before deliberate playback. Closing/Escape pauses, detaches the source, unmounts the player and returns focus to its marker. No-JS retains ordinary MP4 links. Existing photo navigation remains separate.

At the owner's explicit request, recorded GPS may be extracted locally:

```sh
node scripts/extract-travel-gps.mjs /path/to/video.mp4 your-video-slug
```

Requires ExifTool. Writes an ignored sidecar of relative-time longitude/latitude samples, using valid 2D/3D fixes with reported horizontal error at most 25m. It omits UTC times, altitude and device identity. Review and explicitly attach the samples as the video's `track` in the ignored draft record; never auto-publish them. No GPS means no fabricated route or moving marker. Photo-stop centres remain approximate by default.

The owner-approved exact-pin preview uses one small labelled MapLibre marker per photo/video, with no place grouping, stacks, count badges or leader lines. A linked chronological polaroid strip sits inside the map: a row when it fits, otherwise native horizontal scrolling with CSS scroll snap. Hover/first activation selects a card and its exact pin; a second activation opens the media. Pin selection reveals the corresponding card. Arrow keys and swipe selection step through the strip; deliberate selection pans off-screen pins or uses the library's bounds fitting to separate nearby locations. The strip hides while the in-map video player is open, leaving space for the recorded track. No geography or label-placement engine is added. Tests check source EXIF/telemetry against every pin, bidirectional selection, keyboard/swipe behavior, bounds and playback. Source paths/provenance stay in ignored local evidence; Polarsteps re-exports must not be described as camera-original GPS. Location/privacy approval does not authorize publication, original-file hosting or deployment.

Playback/seeking updates a standard MapLibre Marker; standard Source/Layer components show the recorded line. Interpolation is only between nearby recorded samples; gaps over five seconds hide the position and break the line. Opening a video deliberately fits its recorded extent with padding for the actual player/caption; subsequent playback never moves the camera. Closing restores the previous view. No current/browser geolocation is accessed. Higher detail uses overzoomed existing vectors, not fabricated street data.

High-quality local videos can exceed Cloudflare's 25MiB static-file cap. The loopback-only private server uses pinned MIT sirv for byte-range streaming and carries the same privacy/CSP headers plus noindex. It rejects CI and non-loopback Host/Origin values. Normal Cloudflare deployment is unchanged; the publication guard rejects oversized assets instead of forcing destructive compression. Obtain separate approval for suitable media hosting before publishing a large video or precise track.

Do not add fake/empty caption tracks. Review the full clip, audio and any necessary captions/transcript before publication; a local player is not a claim of caption-complete accessibility.

## Full-resolution copies and private object storage

`import-travel-photo.mjs` also creates a full-resolution lossless WebP, retaining the colour profile but omitting EXIF/IPTC/XMP. HEIC is decoded locally with macOS `sips`; lossless describes the resulting pixels, not a byte-identical HEIC/JPEG or preserved HDR gain map. Responsive images remain smaller lossy previews.

`node scripts/import-travel-video-original.mjs /path/to/video.mp4 slug` remuxes compatible H.264/HEVC and AAC packets without re-encoding, strips container metadata/telemetry, and compares encoded audio/video hashes. It preserves orientation and codec colour information. The private draft uses separate H.264 previews for compatibility. Published Taiwan playback uses the original-quality HEVC copies by explicit owner request; some browsers may reject them or decode audio without video. Native original-quality download links remain available. HDR preview conversion uses macOS VideoToolbox to BT.709 with explicit orientation; visual/audio review remains required. Previews keep the full duration and source frame rate, with a 1080p bounding box; portrait video is correspondingly narrower.

`TRAVEL_R2_BUCKET=<private-bucket> bun scripts/sync-travel-r2.ts --upload` uploads only explicitly staged sanitized media using the existing `cf` login. Without `--upload` it plans locally. `--images-only` defers missing videos but still verifies objects already present, including large files uploaded through another private route. It refuses CI and publicly accessible bucket domains, uses content-addressed keys, verifies size/ETag, and writes an ignored per-file manifest. Single-PUT ETags match the local MD5; multipart ETags do not prove a full-file hash, so verify multipart uploads separately by authenticated read-back SHA256 before marking them verified. Upload failures are recorded and return a failing exit status; other files still proceed. It never changes credentials, domains or deployment configuration. Files over the conservative single-PUT budget are marked `needs-s3-multipart`; this script does **not** implement multipart. Completing those requires existing S3 credentials with **Object Read & Write scoped only to the private bucket**, supplied securely—not committed or printed. Do not create/rotate credentials without approval.

Track fitting uses absolute library padding rather than accumulating the selected-media padding. Exact media pins are never displaced, clustered or replaced with stop centres.

## Review and publication

Review visible privacy details, exact dates, place names, approximate centres and captions. A gap between photographs is not an itinerary or a route. Move only approved sanitized derivatives to `public/travels/<trip-id>/`, then add reviewed records to `data/trips.json` with non-preview paths and no draft flag.

Taiwan is now staged as an approved record in `data/trips.json`: six photos and three videos. Sanitized responsive and original-quality WebP images and video posters are local static assets. Playback MP4s and sanitized original-quality video copies use content-addressed URLs on the approved public R2 origin, `https://media.akshat.dev`; they are not squeezed below the static-file cap. The parser accepts only that exact HTTPS origin for MP4s, and CSP permits it only for media. Photos, posters and captions remain local-only. Camera originals and private recovery/evidence files remain ignored and are never deployment inputs.

`page.trips.tsx` extensions enable only with real approved trips or explicit private previews, avoiding zero-parameter static dynamic routes. Only approved trips enter the sitemap. An empty approved dataset still omits the gallery and travel routes. Deployment remains a separately approved action.

The private browser suite uses `TRAVEL_PREVIEW_DRAFTS_ONLY=1` alongside `TRAVEL_PREVIEW=1` to test the retained local Taiwan draft independently of its approved counterpart. This mode excludes approved records from the isolated preview export; it is refused outside private-preview mode and in CI. Ordinary previews retain duplicate-ID rejection. Neither the ignored source draft nor production data is rewritten.

Run check, normal build/tests and the publication guard. Deployment/pushing master requires explicit approval. The older abstract roadside fixture remains an isolated legacy fallback, never a simultaneous travel section.

## Provenance and reproduction

See [`public/maps/README.md`](../public/maps/README.md) for the pinned upstream asset source, regional extraction, checksums and licenses. `bun scripts/prepare-map-assets.ts` regenerates the existing localized upstream style, downloads the pinned glyphs/sprites and copies the installed worker. Checked-in map assets make ordinary builds offline with respect to map vendors.

Personal photographs/videos are not licensed as site code or map data. Seedbed/Lucide provenance is unchanged.
