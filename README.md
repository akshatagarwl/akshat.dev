# akshat.dev

Personal website. React 19 and Tailwind 4, built with [vinext](https://github.com/cloudflare/vinext)
and served from a Cloudflare Worker.

vinext reimplements the Next.js API surface on Vite, so the `app/` directory and
`next.config.mjs` are still the source of truth even though the `next` package is
not installed.

## Local development

Run `mise run dev`. To reproduce the production build, run `mise run build`, then
`bun run start` to serve the built Worker locally.

## Deployment

Pushing to `master` builds and deploys through Workers Builds. To deploy by hand,
run `bun run deploy`, which builds and then runs `wrangler deploy` against the
generated `dist/server/wrangler.json`.

## Configuration worth knowing

- **Security headers live in `next.config.mjs`, not `public/_headers`.** On
  Workers, `_headers` only reaches static assets, never Worker-rendered HTML, so
  the headers would silently vanish from the pages themselves. The `source` is
  `/(.*)` because `/:path*` does not match the root path.
- **Tailwind is configured in CSS**, in `app/global.css` via `@theme` and
  `@plugin`. There is no `tailwind.config.ts` and no PostCSS step; styling runs
  through `@tailwindcss/vite`.
- **Metadata routes need `export const dynamic = 'force-static'`**
  (`app/robots.ts`, `app/sitemap.ts`).

## Hostnames

`akshat.dev` is canonical and every page declares a canonical URL under it.
`www.akshat.dev` serves the same Worker. `REMOVED` redirects to
`REMOVED` via the `REMOVED` Worker.
