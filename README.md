# akshat.dev

A light-only personal website: eight projects, photo-led travel diaries, two agent notes and sixteen reading links. No theme selectors or preference storage. Six reading links are shown initially; a native disclosure opens the remaining ten.

## Existing tools, not a custom animation engine

Next.js 16.4.6, React 19.3.1, TypeScript 6.0.3, plain CSS and self-hosted fonts. Flowers use **[Seedbed's actual MIT-licensed Canvas engine](https://github.com/VedSoni-dev/seedbed)**, vendored unchanged at a pinned commit. See [`vendor/seedbed/README.md`](vendor/seedbed/README.md) for provenance. The former home-grown animation engine has been removed.

The React adapter supplies eight flower colors, mixed cosmos/daisy/tulip/lavender shapes and lifecycle cleanup. Upstream handles seeded plant geometry, growth/wilt continuity, animation frames, visibility and resize. Native touch scrolling is restored with a CSS `pan-y` override. No extra animation framework is needed.

Reduced motion, absent Canvas and no JavaScript show local flower images rendered by the same engine. Old saved preferences are ignored; the whole site stays light even when the OS is dark. No preferences are read or stored.

## Travel diaries

**Map first:** Three.js 0.187.0 makes a large, orbitable regional map the highlight of both the homepage preview and trip page. Select photo markers, then open the pictures in the existing native viewer. The full photo journal is below the map. Official OrbitControls provide bounded mouse/keyboard orbit/pan; zoom/fit buttons remain native. Wheel/touch gestures scroll normally. Rendering is on demand, with no idle animation loop or automatic camera rides. SVG, no-JS and WebGL-loss fallbacks preserve the places and photographs.

The first local prototype uses Taiwan, a self-hosted public-domain Natural Earth basemap (raised as a stylistic silhouette, not real elevation) and owner-supplied photos. No remote tiles, map accounts, invented routes or diary prose. Photo derivatives are metadata-free, but visible people/private details still need manual review.

Approved records go in initially empty `data/trips.json`. Until then, the gallery and travel routes are absent from production. Private drafts/media stay ignored and export only to `.generated/travel-export`, never production `out/`. See [`docs/travel-diary.md`](docs/travel-diary.md) for the local preview and review/publication workflow. The older abstract roadside diary remains a tested legacy fallback.

## Run

Use Node/Bun pinned in `mise.toml`:

```sh
bun install --frozen-lockfile
bun run dev                  # http://127.0.0.1:4321
bun run check
bun run test:engine           # Seedbed lifecycle + diary/trip validation tests
bun run build                # prepares trusted notes and exports to out/
bun run preview              # local Cloudflare runtime, port 4321
bunx playwright install chromium
bun run test
bun run render:garden        # optional: regenerate static flower images locally
bun run preview:travel       # private local draft; requires staged media/manifest
bun run test:travel-preview  # opt-in private preview checks; never a public CI fixture
```

Set `PLAYWRIGHT_CHROME_PATH` to an existing Chrome executable instead of installing managed Chromium. Browser tests use isolated profiles, not personal sessions. Stop an existing preview before starting dev on the same port. Next/Wrangler run under Node; Bun manages dependencies and renders trusted local Markdown. Build-tool telemetry is disabled.

## Boundaries

Flowers stay in the empty home scene and desktop margins, not over text. Notes remain at `/tv` and `/qin`; `/links` redirects to `/#links`. Essential content, links and the reading disclosure work without JavaScript. Agent notes explicitly say **agent notes — not for human eyes**: public working context, not private storage or polished guides.

No account API, analytics, remote fonts, tokens or permission prompts. Do not publish credentials, device identifiers, account profiles, signing keys, personal channel lists or private exceptions. Seedbed's account/store/API/telemetry code is not included.

See [`docs/verification.md`](docs/verification.md) for checks and limitations. Code is MIT; third-party and font licenses are in `public/licenses/`. Personal travel photographs/videos are not covered by the code license. Natural Earth map data is public domain.

## Deployment

Cloudflare Worker `akshat-dev` serves static `out/` with the existing headers and redirect. **Pushing master deploys production. Deployment and shared history replacement require explicit approval.** Keep the private recovery bundle/original working tree and use an exact remote-SHA lease for approved replacement. Never push an empty intermediate repository. Manual deployment after approval: `bun run deploy`.
