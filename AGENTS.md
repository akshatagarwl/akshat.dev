# Working on akshat.dev

Next.js App Router, React, TypeScript, plain CSS and static Cloudflare export. Keep the single-column site concise and light-only. **No theme selectors, appearance settings or preference storage.** Preserve all eight projects, sixteen reading links (ten in a native disclosure), /tv, /qin and /links → /#links. Agent notes explicitly say “agent notes — not for human eyes”; preserve their working context.

Travel is a roadside diary, not a dashboard: scrolling, a bicycle path, mountains/shoreline marks, readable notebook pages and native photo scrolling. See docs/travel-diary.md. Real owner-supplied entries go in data/travels.json, initially empty. Hide the entire section when there are no entries; no placeholder, empty heading or travel illustration on the live page. Never invent trips, dates, memories or photographs. Test fixtures stay outside the public export. No public add/edit endpoint, live location, geolocation permissions or remote maps. Review photos for GPS/EXIF and personal details before publication; metadata is not automatically stripped. Month precision is intentional.

Reuse licensed implementations: unchanged pinned Seedbed engine/mark and Lucide icons. Preserve notices/provenance; never import reference account/token/store/telemetry code. Native links/disclosure/photo scrolling stay native. CSS view timelines drive scrollytelling; no scroll hijacking, perpetual animation or extra JS scroll loop. Reduced motion removes riding, sticky scenery and animated flowers. Unsupported features remain static and legible; essential content works without JS/Canvas.

Flowers stay in the empty home scene and desktop margins, never over text. Clean up engines/listeners. No analytics, remote fonts, account APIs, credentials, device addresses, signing keys, personal lists or private exceptions in public files.

Run bun run check, bun run build and bun run test. Tests use isolated Chromium/local assets, never the TV or phone. Engine tests also validate/render a clearly labeled, unpublished diary fixture. bun run render:garden reproduces local static flower images. Pin dependencies and preserve the lockfile.

Use Conventional Commits. Production deployment and shared history replacement require explicit approval; pushing master deploys production. Keep private recovery backups and the original working tree until approved.
