import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'travel-preview.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4323' },
  webServer: {
    command: 'TRAVEL_PREVIEW=1 bun run build && node node_modules/wrangler/bin/wrangler.js dev --assets .generated/travel-export --local --ip 127.0.0.1 --port 4323',
    url: 'http://127.0.0.1:4323', reuseExistingServer: false, timeout: 180_000,
    env: { WRANGLER_SEND_METRICS: 'false', NEXT_TELEMETRY_DISABLED: '1' },
  },
});
