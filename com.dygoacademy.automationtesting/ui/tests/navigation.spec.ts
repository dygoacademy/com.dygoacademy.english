import type { Locator, Page } from '@playwright/test';

import { SIGN_IN_SKIP_REASON, expect, hasSignedInSession, test } from './fixtures';

/**
 * Signed-in navigation (Phase 12, UI-3 U3-4), at every QA viewport:
 * - every tab of the bottom tab bar opens its screen and becomes current,
 *   and the tab bar does not move or resize between tabs (no layout jump);
 * - the back button of a Topic bed and of a Group garden returns to the list.
 * Uses the fixture user from `.env.e2e`; skips without one. English UI.
 */
test.use({ gardenLocale: 'en-US' });
test.skip(() => !hasSignedInSession(), SIGN_IN_SKIP_REASON);

/** components.tabBar.label in en-US.json. */
const TAB_BAR_LABEL = 'Main';
/** Allowed tab-bar drift between screens, in CSS px (sub-pixel rounding). */
const JUMP_TOLERANCE = 1;

function tabBar(page: Page): Locator {
  return page.getByRole('navigation', { name: TAB_BAR_LABEL });
}

async function gotoSignedIn(page: Page, path: string): Promise<void> {
  await page.goto(path);
  expect(new URL(page.url()).pathname, 'signed-in session was not accepted (redirected)').toBe(path);
}

/** Tab bar box once it has stopped moving (live data can still be loading). */
async function settledBox(bar: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  await expect(bar).toBeVisible();
  let prev = await bar.boundingBox();
  await expect
    .poll(
      async () => {
        const next = await bar.boundingBox();
        const same = JSON.stringify(next) === JSON.stringify(prev);
        prev = next;
        return same;
      },
      { intervals: [250], timeout: 15_000, message: 'tab bar kept moving' },
    )
    .toBe(true);
  if (!prev) throw new Error('tab bar has no bounding box');
  return prev;
}

test('every tab opens and the tab bar does not jump', async ({ page }) => {
  await gotoSignedIn(page, '/garden');
  const bar = tabBar(page);
  const baseline = await settledBox(bar);

  const links = bar.getByRole('link');
  const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
  expect(hrefs.length, 'tab count (4, or 5 for group members)').toBeGreaterThanOrEqual(4);

  // Visit each tab, then come back to the first one.
  for (const href of [...hrefs.slice(1), hrefs[0]]) {
    const link = bar.locator(`a[href="${href}"]`);
    await link.click();
    await page.waitForURL((u) => u.pathname === href);
    await expect(tabBar(page).locator(`a[href="${href}"]`)).toHaveAttribute('aria-current', 'page');
    const box = await settledBox(tabBar(page));
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(box[key] - baseline[key]), `tab bar ${key} on ${href}`).toBeLessThanOrEqual(
        JUMP_TOLERANCE,
      );
    }
  }
});

/**
 * Open the first detail link under `listPath` whose href matches `detail`,
 * then press Back and expect to land on `listPath` again.
 */
async function checkBack(page: Page, listPath: string, detail: RegExp, what: string): Promise<void> {
  await gotoSignedIn(page, listPath);
  await tabBar(page).waitFor();
  const candidates = page.locator(`a[href^="${listPath}/"]`);
  const hrefs = (
    await candidates.evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''))
  ).filter((h) => detail.test(h));
  test.skip(hrefs.length === 0, `the fixture user has no ${what}; add one to test Back`);

  const target = hrefs[0];
  await page.locator(`a[href="${target}"]`).first().click();
  await page.waitForURL((u) => u.pathname === target);
  await page.getByRole('link', { name: /^Back/ }).first().click();
  await page.waitForURL((u) => u.pathname === listPath);
  await expect(tabBar(page)).toBeVisible();
}

test('Back from a Topic bed returns to Topics', async ({ page }) => {
  await checkBack(page, '/topics', /^\/topics\/[^/]+$/, 'topics');
});

test('Back from a Group garden returns to Groups', async ({ page }) => {
  await checkBack(page, '/groups', /^\/groups\/[^/]+$/, 'shared gardens');
});

/** UI-8 U8-5: old /garden/<x> and classic paths land on the short URLs. */
test('old garden and classic paths redirect to the short URLs', async ({ page }) => {
  for (const [from, to] of [
    ['/garden/topics', '/topics'],
    ['/garden/me', '/me'],
    ['/garden/review', '/review'],
    ['/study', '/review'],
    ['/', '/garden'],
  ] as const) {
    await page.goto(from);
    expect(new URL(page.url()).pathname, `${from} redirect`).toBe(to);
  }
});
