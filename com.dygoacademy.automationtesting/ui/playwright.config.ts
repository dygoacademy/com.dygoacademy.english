import { defineConfig } from '@playwright/test';

import { QA_VIEWPORTS } from './viewports';

/**
 * Word Garden screenshot suite (Phase 12, UI-3 U3-3).
 *
 * BASE_URL      app under test (default http://localhost:3000, i.e. `npm run dev`
 *               in com.dygoacademy.frontend)
 * CHROME_PATH   optional Chrome/Chromium binary; default: the installed Google Chrome
 *
 * Every request carries the `dygo_ui=garden` cookie (see tests/fixtures.ts).
 * Signed-in fixture user (U3-4): global-setup.ts signs in with E2E_EMAIL /
 * E2E_PASSWORD from `.env.e2e` and saves `.auth/user.json`; without them the
 * signed-in tests skip.
 */
const executablePath = process.env.CHROME_PATH || undefined;

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  outputDir: './test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 60_000,
  expect: {
    // At most 0.5% of pixels may differ.
    toHaveScreenshot: { maxDiffPixelRatio: 0.005, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    launchOptions: executablePath ? { executablePath } : undefined,
    channel: executablePath ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  projects: QA_VIEWPORTS.map((v) => ({
    name: v.name,
    use: {
      viewport: { width: v.width, height: v.height },
      hasTouch: v.hasTouch,
    },
  })),
});
