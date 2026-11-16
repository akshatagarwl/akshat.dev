# Seedbed flower engine

Source: https://github.com/VedSoni-dev/seedbed

Pinned commit: `e9ae88088bb3ef8775dcce1d2dd01083e19be1a3`

- `engine.js`: unchanged upstream `lib/seedbed.js`.
- `engine.d.ts`: unchanged upstream `lib/seedbed.d.ts`.
- `Mark.tsx`: unchanged upstream `components/Mark.tsx`, reused for diary waypoints.
- `LICENSE`: upstream MIT license, also published at `/licenses/seedbed.txt`.
- `../../scripts/test-seedbed.mjs`: upstream `scripts/test-engine.mjs`, with the two relative paths updated to this directory and an attribution header added.

Our React adapter supplies colors/options, enforces light mode, removes the engine for reduced motion, and tears it down on unmount. CSS overrides the upstream Canvas `touch-action: none` with `pan-y` to preserve page scrolling. The static fallback is rendered locally using the same engine by `scripts/render-garden.mjs`. No auth, account tokens, telemetry, API routes or styling kit from the reference is included.
