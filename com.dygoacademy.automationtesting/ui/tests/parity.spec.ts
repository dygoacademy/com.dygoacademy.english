import type { BrowserContext, Page } from '@playwright/test';

import { SIGN_IN_SKIP_REASON, expect, hasSignedInSession, test } from './fixtures';

/**
 * Classic ↔ garden parity (Phase 12, UI-4 U4-5; G2 check).
 * For the signed-in fixture user, the classic home (`/`) and the garden
 * home (`/garden`) must show the same due count, streak and mastered
 * count. Both read GET /srs/stats, so the test captures the stats each
 * home actually loaded and compares them, then checks the numbers on
 * screen where the classic home prints them. Skips without `.env.e2e`.
 * Runs once (first QA viewport): the numbers do not depend on layout.
 */
test.use({ gardenLocale: 'en-US' });
test.skip(() => !hasSignedInSession(), SIGN_IN_SKIP_REASON);

type ParityStats = {
  due_now: number;
  current_streak_days: number;
  mastered_words: number;
  stage_counts?: { new: number; learning: number; review: number; mastered: number };
};

async function setUi(context: BrowserContext, baseURL: string | undefined, ui: 'classic' | 'garden') {
  const url = new URL(baseURL ?? 'http://localhost:3000');
  await context.addCookies([{ name: 'dygo_ui', value: ui, domain: url.hostname, path: '/' }]);
}

/** Opens `path` and returns the GET /srs/stats body that page loaded. */
async function statsOn(page: Page, path: string): Promise<ParityStats> {
  const response = page.waitForResponse(
    (r) => r.request().method() === 'GET' && /\/srs\/stats(\?|$)/.test(r.url()) && r.ok(),
  );
  await page.goto(path);
  const body = (await (await response).json()) as ParityStats | { data: ParityStats };
  return 'data' in body ? body.data : body;
}

test('classic home and /garden show the same due, streak and mastered', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone-se', 'numbers do not depend on the viewport');

  await setUi(context, baseURL, 'classic');
  const classic = await statsOn(page, '/');
  expect(new URL(page.url()).pathname, 'classic home redirected').toBe('/');
  await expect(page.getByText(`${classic.current_streak_days}-day streak`)).toBeVisible();

  await setUi(context, baseURL, 'garden');
  const garden = await statsOn(page, '/garden');
  expect(new URL(page.url()).pathname, 'signed-in session was not accepted (redirected)').toMatch(
    /^\/garden/,
  );

  const pick = (s: ParityStats) => ({
    due_now: s.due_now,
    current_streak_days: s.current_streak_days,
    mastered_words: s.mastered_words,
  });
  expect(pick(garden)).toEqual(pick(classic));

  // U4-2/U4-3: the garden's plants come from stage_counts; its trees must
  // be the same mastered count the classic screens use.
  if (garden.stage_counts) {
    expect(garden.stage_counts.mastered).toBe(garden.mastered_words);
  }
});
