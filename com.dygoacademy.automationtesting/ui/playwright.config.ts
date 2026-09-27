import { defineConfig } from '@playwright/test';

import { QA_VIEWPORTS } from './viewports';

/**
 * Word Garden screenshot suite (Phase 12, UI-3 U3-3).
 *
 * BASE_URL      app under test (default http://localhost:3000, i.e. `npm run dev`
 *               in com.dygoacademy.frontend; the reference pages 404 in production)
 * CHROME_PATH   optional Chrome/Chromium binary; default: the installed Google Chrome
 *
 * Every request carries the `dygo_ui=garden` cookie (see tests/fixtures.ts).
 * No sign-in yet: that is U3-4.
 */
const executablePath = process.env.CHROME_PATH || undefined;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 60_000,
  expect: {
    // Same bar as `garden:diff`: at most 0.5% of pixels may differ.
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
