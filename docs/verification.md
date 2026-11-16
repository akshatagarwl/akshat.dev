# Local verification — roadside diary, 2026-11-15

No production deployment, remote push, TV connection or phone connection. Previous selectable flower version is preserved on local branch `preview/flower-options`.

## Passing checks

- Frozen dependency install and production audit pass; no known vulnerabilities reported across 58 checked packages (not a complete security audit).
- Wrangler deployment dry-run validates the 66-file static export; nothing uploaded or deployed.
- `bun run check`: trusted content preparation, Next route types and TypeScript.
- `bun run build`: Seedbed/diary tests, production compilation, TypeScript and static export.
- `bun run test`: **28 browser tests**, desktop/mobile Chromium emulation, against exported assets through local Wrangler under Node.
- `bun run test:engine`: upstream Seedbed lifecycle/normalization/no-network checks plus diary content validation, empty state, date formatting/sorting, escaping and visible server-rendered pages.

## Diary and interaction

Theme selectors, old environment branches and preference scripts are removed. There are no buttons or application preference reads/writes. Saved old dark/environment settings and denied storage have no effect. The site remains light when the OS is dark.

Bicycle position follows native scrolling, reverses when scrolling back, stays within the sketch, and stops for reduced motion. A long test diary keeps the landscape pinned while prose scrolls normally and the bicycle continues advancing through the section. Focused photo regions remain clear of the sticky scene. Reduced motion restores a flat, nonsticky diary.

Populated diary pages have prose visible without clicking. Native photo scrolling works by keyboard; images have descriptive alt text and optional captions. A populated fixture also remains readable without JavaScript. Source data is validated, newest first, using month precision; remote/traversal image paths and duplicate slugs are rejected. Real `data/travels.json` is empty; its entire section is omitted from the live HTML, without an empty-state label or sketch. A server-rendering assertion requires exactly empty output for an empty diary, and browser checks verify the section is absent. Adding a real entry reveals the diary automatically. Fictional test pages are explicitly labeled, generated outside the public export, injected only in isolated browser tests and absent from exported assets.

Native CSS view timelines provide scroll-linked behavior; there is no production scroll handler or scrollytelling RAF loop. The static base scene remains for browsers without view-timeline support. Lucide supplies the bicycle/terrain symbols; its full license is retained. Seedbed engine, declarations and waypoint mark are pinned upstream copies with notices retained.

## Preserved behavior

Eight projects, two full agent notes and sixteen reading links remain; ten reading links expand with a native keyboard-accessible/no-JS disclosure. Visible homepage copy stays below 210 words. `/tv`, `/qin`, canonical URLs, sitemap/robots, `/links` redirect, security headers and real 404 status pass.

The actual Seedbed engine blooms in multiple colors and settles after leaving/wilting. Native vertical touch scrolling works in Chromium touch emulation. Live reduced-motion changes remove/recreate engines; no Canvas/no JavaScript retain local static flowers. Initial rendering makes no off-origin requests or browser page errors.

Home, both notes and populated diary fixtures pass automated WCAG A/AA/2.2 checks. Overflow checks pass at 320, 390, 768 and 1440 CSS pixels. Desktop/mobile screenshots of the actual homepage (travel section absent) and a clearly labeled populated fixture are generated; representative images reviewed.

## Limits

Not verified: Safari/WebKit, physical-phone motion/touch, screen-reader user testing, universal 60 fps, battery/GPU use, production rollout, external-link uptime or Lighthouse scores. No real travel photos supplied; image metadata is not automatically sanitized. Existing agent-note device facts are retained working-log snapshots, not fresh hardware tests.
