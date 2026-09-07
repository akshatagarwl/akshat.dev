# akshat.dev

Personal website built as a static Next.js export for Cloudflare Pages.

## Local development

Run `mise run dev`. To reproduce the production build, run `mise run build`.

## Cloudflare Pages

Project settings:

- Build command: `bun install --frozen-lockfile && bun run build`
- Build output directory: `out`
- Framework preset: Next.js (Static HTML Export)
- Environment variable: `BUN_VERSION=1.3.14`, which needs build system version v2 or later
- Production branch: `cloudflare-pages` until Vercel is decommissioned, because a
  push to `master` triggers a Vercel production deploy

Pages reads `public/_headers` and `public/_redirects` from the exported output. They
carry the security headers and the `/api/resume` path redirect.

## Hostname routing

`_redirects` cannot match on hostname, so `www` and `resume` are **not** handled by
this repository. They need zone-level Redirect Rules under Rules in the Cloudflare
dashboard, and they only fire on proxied records once the zone is active.
