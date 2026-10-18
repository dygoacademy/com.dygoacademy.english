import { test as base, expect, type Page } from '@playwright/test';

import { AUTH_FILE, SIGN_IN_SKIP_REASON, hasSignedInSession } from '../auth';

export { SIGN_IN_SKIP_REASON, hasSignedInSession };

/** The two languages the canvas references exist in (plan §10 rule 10). */
export const SCREENSHOT_LOCALES = ['en-US', 'vi-VN'] as const;
export type ScreenshotLocale = (typeof SCREENSHOT_LOCALES)[number];

/** No animations, no Next.js dev overlay. */
const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important}' +
  'nextjs-portal,.tsqd-parent-container{display:none!important}';

/**
 * `test` with the garden opt-in cookie on every request. `gardenLocale`
 * also sets the `dygo_locale` cookie (the gallery reads the language from
 * it). When global-setup.ts signed the fixture user in (U3-4), every test
 * starts with that session.
 */
export const test = base.extend<{ gardenLocale: ScreenshotLocale | null }>({
  gardenLocale: [null, { option: true }],
  storageState: async ({}, use) => {
    await use(hasSignedInSession() ? AUTH_FILE : undefined);
  },
  context: async ({ context, baseURL, gardenLocale }, use) => {
    const url = new URL(baseURL ?? 'http://localhost:3000');
    const cookies = [{ name: 'dygo_ui', value: 'garden', domain: url.hostname, path: '/' }];
    if (gardenLocale) {
      cookies.push({ name: 'dygo_locale', value: gardenLocale, domain: url.hostname, path: '/' });
    }
    await context.addCookies(cookies);
    await use(context);
  },
});

/** Wait for the garden to be revealed, freeze motion, wait for fonts. */
export async function settleGarden(page: Page): Promise<void> {
  await page.waitForSelector('[data-ui="garden"]', { state: 'visible' });
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

export { expect };
