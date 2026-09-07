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

`akshat.dev` is canonical. `www` redirects to it, and `REMOVED` serves
`resume.pdf` inline at its root, which is what it did on Vercel.

`_redirects` cannot match on hostname, so neither is handled by this repository.
Both are zone-level rules in the Cloudflare dashboard, and both only fire on
proxied records once the zone is active:

- A redirect rule sending `www.akshat.dev` to `https://akshat.dev` with the path
  preserved.
- A URL rewrite rule on `REMOVED` rewriting the path to `/resume.pdf`,
  so the PDF is still returned with a 200 rather than a cross-host redirect. A
  rewrite is required because a redirect would change the URL and the status.
