# akshat.dev

A light-only personal website: eight projects, a roadside travel diary, two agent notes and sixteen reading links. No theme selectors or preference storage. Six reading links are shown initially; a native disclosure opens the remaining ten.

## Existing tools, not a custom animation engine

Next.js 16.4.6, React 19.3.1, TypeScript 6.0.3, plain CSS and self-hosted fonts. Flowers use **[Seedbed's actual MIT-licensed Canvas engine](https://github.com/VedSoni-dev/seedbed)**, vendored unchanged at a pinned commit. See [`vendor/seedbed/README.md`](vendor/seedbed/README.md) for provenance. The former home-grown animation engine has been removed.

The React adapter supplies eight flower colors, mixed cosmos/daisy/tulip/lavender shapes and lifecycle cleanup. Upstream handles seeded plant geometry, growth/wilt continuity, animation frames, visibility and resize. Native touch scrolling is restored with a CSS `pan-y` override. No extra animation framework is needed.

Reduced motion, absent Canvas and no JavaScript show local flower images rendered by the same engine. Old saved preferences are ignored; the whole site stays light even when the OS is dark. No preferences are read or stored.

## Roadside diary

A bicycle follows normal scrolling through mountain contours and shoreline marks. With entries, the landscape stays beside the reading journey while dated notebook pages pass below; no hidden prose, map dashboard or scroll hijacking. Native CSS view timelines and Lucide icons provide the behavior and symbols. Reduced motion/unsupported browsers retain readable, static scenery.

Add real places, monthly dates, notes and approved local photos in `data/travels.json`. It starts empty and the entire section stays hidden until the first real entry—no placeholder or invented trips. See [`docs/travel-diary.md`](docs/travel-diary.md) for the interaction design, content template and photo privacy requirements.

## Run

Use Node/Bun pinned in `mise.toml`:

```sh
bun install --frozen-lockfile
bun run dev                  # http://127.0.0.1:4321
bun run check
bun run test:engine           # Seedbed lifecycle + diary validation/rendering tests
bun run build                # prepares trusted notes and exports to out/
bun run preview              # local Cloudflare runtime, port 4321
bunx playwright install chromium
bun run test
bun run render:garden        # optional: regenerate static flower images locally
```

Set `PLAYWRIGHT_CHROME_PATH` to an existing Chrome executable instead of installing managed Chromium. Browser tests use isolated profiles, not personal sessions. Stop an existing preview before starting dev on the same port. Next/Wrangler run under Node; Bun manages dependencies and renders trusted local Markdown. Build-tool telemetry is disabled.

## Boundaries

Flowers stay in the empty home scene and desktop margins, not over text. Notes remain at `/tv` and `/qin`; `/links` redirects to `/#links`. Essential content, links and the reading disclosure work without JavaScript. Agent notes explicitly say **agent notes — not for human eyes**: public working context, not private storage or polished guides.

No account API, analytics, remote fonts, tokens or permission prompts. Do not publish credentials, device identifiers, account profiles, signing keys, personal channel lists or private exceptions. Seedbed's account/store/API/telemetry code is not included.

See [`docs/verification.md`](docs/verification.md) for checks and limitations. Code is MIT; third-party and font licenses are in `public/licenses/`.

## Deployment

Cloudflare Worker `akshat-dev` serves static `out/` with the existing headers and redirect. **Pushing master deploys production. Deployment and shared history replacement require explicit approval.** Keep the private recovery bundle/original working tree and use an exact remote-SHA lease for approved replacement. Never push an empty intermediate repository. Manual deployment after approval: `bun run deploy`.
