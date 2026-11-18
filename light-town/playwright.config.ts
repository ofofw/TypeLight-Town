import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}/`;

/**
 * chrome: the installed Google Chrome. webkit: Playwright's WebKit build (Safari's engine, not Safari itself).
 * ipad-sim: WebKit with an iPad-sized touch viewport and iPad user agent. It is a simulation only:
 * results from it are never reported as real-iPad results.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: {
    baseURL,
    locale: 'zh-CN',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx vite preview --port ${port} --strictPort --host 127.0.0.1`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
    { name: 'ipad-sim', use: { ...devices['iPad Pro 11 landscape'] }, grep: /@layout|@flow/ },
  ],
});
