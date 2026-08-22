import { defineConfig } from '@playwright/test';

// Generates the screenshots used in README.md and docs/user_guide/screenshots.md (see
// capture.spec.ts). Kept as its own config, separate from ../playwright.config.ts, so this
// never runs as part of the regular e2e suite (`npm test`, whose testDir is `../tests`) —
// it's invoked explicitly via `npm run screenshots`.
export default defineConfig({
  testDir: '.',
  globalSetup: '../tests/global-setup.ts',
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.FRONTEND_URL ?? 'http://localhost:8080',
    // Fixed viewport so regenerated screenshots stay visually consistent run to run.
    viewport: { width: 1440, height: 900 },
    trace: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
