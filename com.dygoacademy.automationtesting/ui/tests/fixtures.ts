import fs from 'node:fs';
import path from 'node:path';

import { test as base, expect, type Page } from '@playwright/test';

import { AUTH_FILE, SIGN_IN_SKIP_REASON, hasSignedInSession } from '../auth';

export { SIGN_IN_SKIP_REASON, hasSignedInSession };

/** The two languages the canvas references exist in (plan §10 rule 10). */
export const SCREENSHOT_LOCALES = ['en-SG', 'vi-VN'] as const;
export type ScreenshotLocale = (typeof SCREENSHOT_LOCALES)[number];

/** Same freeze as `garden:diff`: no animations, no Next.js dev overlay. */
const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important}' +
  'nextjs-portal,.tsqd-parent-container{display:none!important}';

/**
 * The canvas reference PNGs (docs/design/garden/reference). Each `<name>.png`
 * has a page /garden/_reference/<name>; `<name>-vi.png` means it is also
 * drawn in Vietnamese. Read from disk so new canvas screens are picked up
 * without editing this suite. REFERENCE_DIR overrides the folder.
 */
export function referenceScreens(): { name: string; locales: ScreenshotLocale[] }[] {
  const dir =
    process.env.REFERENCE_DIR ||
    path.resolve(__dirname, '../../../docs/design/garden/reference');
  if (!fs.existsSync(dir)) return [];
  const files = new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.png')));
  return [...files]
    .filter((f) => !f.endsWith('-vi.png'))
    .map((f) => f.slice(0, -'.png'.length))
    .sort()
    .map((name) => ({
      name,
      locales: files.has(`${name}-vi.png`) ? ['en-SG', 'vi-VN'] : ['en-SG'],
    }));
}

/**
 * `test` with the garden opt-in cookie on every request. `gardenLocale`
 * also sets the `dygo_locale` cookie (the gallery reads the language from
 * it; the reference pages take `?locale=` instead). When global-setup.ts
 * signed the fixture user in (U3-4), every test starts with that session.
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
