import { defineConfig } from '@playwright/test';

// The stack (docker/docker-compose.e2e.yml) is started separately, both
// locally and in CI — no `webServer` here, since it's not a single process
// Playwright could own the lifecycle of.
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: process.env.FRONTEND_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
