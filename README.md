# akshat.dev

Personal website built as a static Next.js export for Cloudflare Pages.

## Cloudflare Pages

- Build command: `bun install --frozen-lockfile && bun run build`
- Build output directory: `out`
- Framework preset: Next.js (Static HTML Export)
- Environment variable: `BUN_VERSION=1.3.14`

Cloudflare Pages serves `public/_headers` and `public/_redirects` from the exported output. The `/api/resume` redirect is included for compatibility.

Attach `akshat.dev` as the Pages custom domain. Pages creates the proxied apex DNS record. Then create proxied CNAME records for `www` and `resume` targeting `akshat.dev`, and configure these hostname redirects:

- `www.akshat.dev/*` to `https://akshat.dev/$1`
- `REMOVED/*` to `REMOVED`

For local development, run `mise run dev`. To reproduce the production build, run `mise run build`.
