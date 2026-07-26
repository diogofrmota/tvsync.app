import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
const TMDB_MOCK_PORT = Number(process.env.TMDB_MOCK_PORT ?? 4100);
const tmdbMockUrl = `http://localhost:${TMDB_MOCK_PORT}`;

// Some sandboxed dev containers ship a pinned Chromium build outside npm's
// control at this fixed path; pointing at it directly avoids
// `@playwright/test` trying to download a browser revision of its own. Real
// CI runners (and most local machines) don't have this path, so fall back to
// Playwright's normal, npm-managed browser resolution — `npx playwright
// install chromium` — instead of failing to launch.
const SANDBOX_CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const chromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: chromiumExecutablePath },
      },
    },
  ],
  webServer: [
    {
      command: 'node tests/e2e/mocks/tmdb-mock-server.mjs',
      env: { TMDB_MOCK_PORT: String(TMDB_MOCK_PORT) },
      name: 'tmdb-mock',
      // Ready-check by port, not url: every real route in the mock 404s for
      // an unmatched path (including bare "/"), and 404 isn't one of the
      // status codes Playwright's url-based probe accepts.
      port: TMDB_MOCK_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
    },
    {
      command: `pnpm dev --port ${PORT}`,
      env: {
        // Anonymous browsing and public detail/season/episode pages never
        // read the database (progress/library reads short-circuit before
        // querying when there is no session — see BEHAVIOR.md), so a real
        // Neon connection is only needed for the auth/library journeys,
        // which are gated behind E2E_REAL_DATABASE.
        TMDB_API_KEY: 'e2e-mock-key',
        TMDB_API_URL: tmdbMockUrl,
      },
      name: 'next-app',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: baseURL,
    },
  ],
});
