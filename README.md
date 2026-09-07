# akshat.dev

Personal website built as a static Next.js export for Cloudflare Pages.

## Local development

Run `mise run dev`. To reproduce the production build, run `mise run build`.

## Cloudflare Pages

Project settings:

- Build command: `bun install --frozen-lockfile && bun run build`
- Build output directory: `out`
- Framework preset: Next.js (Static HTML Export)
- Environment variable: `BUN_VERSION=1.4.2`, which needs build system version v2 or later
- Production branch: `master`

`public/_headers` carries the security headers, and Pages reads it from the
exported output.

## Hostnames

`akshat.dev` is canonical and every page declares a canonical URL under it.

`akshat.dev` and `www.akshat.dev` are both attached to the Pages project and both
serve the site, so neither needs a redirect rule. The canonical tags are what tell
search engines which one counts.

The `REMOVED` Worker redirects `REMOVED` to
`REMOVED`.
