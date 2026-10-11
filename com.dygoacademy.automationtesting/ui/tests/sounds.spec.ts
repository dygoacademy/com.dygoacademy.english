import path from 'node:path';

import type { Page } from '@playwright/test';

import { SIGN_IN_SKIP_REASON, expect, hasSignedInSession, test } from './fixtures';

/**
 * Phase 13 The Pond (/sounds), signed in (S12, v2 in S19). Its entry points
 * (the Missions-tab Sound Garden card, "Say this one?" on review cards) were
 * removed on 2026-10-06 for a redesign; the page is opened directly.
 *
 * The microphone is stubbed: Chrome's fake capture device plays the
 * fixture sentence once (`%noloop`, then silence, so the v2 auto-stop
 * fires), and the mic permission is granted up front. The speaking API is
 * stubbed too (`/speaking/session`, `/speaking/check-speech`, `/speaking/attempts`),
 * in the backend's `{ success, data }` envelope, so the spec writes nothing,
 * never calls the speech scorer and doesn't depend on which words the
 * fixture user has. Works with the app in either check mode: `server`
 * (UAT since 2026-10-05) uses the stubbed check, `local` ignores it.
 * Phone viewports only (the screens are phone layouts). English UI.
 */
const FIXTURE_DIR = path.resolve(
  __dirname,
  '../../../com.dygoacademy.frontend/public/audio/speaking-fixture',
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fixture = require(path.join(FIXTURE_DIR, 'fixture-mitigate.json')) as {
  sentence: string;
  target_index: number;
  ipa_uk: string;
  ipa_us: string;
  timings_uk: unknown;
  timings_us: unknown;
};

test.use({
  gardenLocale: 'en-US',
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${path.join(FIXTURE_DIR, 'fixture-mitigate-us.wav')}%noloop`,
    ],
  },
});
test.skip(() => !hasSignedInSession(), SIGN_IN_SKIP_REASON);
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, info) => {
  const name = info.project.name;
  info.skip(!name.startsWith('iphone-') || name.includes('landscape'), 'phone portrait only');
});

const WORDS = ['mitigate', 'drought', 'biodiversity', 'sustainable', 'deteriorate'];

function item(word: string, i: number) {
  return {
    id: `e2e-item-${i}`,
    lexicon_id: `e2e-lex-${i}`,
    topic_word_id: `e2e-tw-${i}`,
    word,
    part_of_speech: 'verb',
    cefr_level: 'C1',
    ipa_uk: fixture.ipa_uk,
    ipa_us: fixture.ipa_us,
    definition_en: 'to make something bad less harmful or serious',
    meaning_locale: null,
    meaning_translation: null,
    sentence: fixture.sentence,
    target_index: fixture.target_index,
    audio_uk_url: '/audio/speaking-fixture/fixture-mitigate-uk.m4a',
    audio_us_url: '/audio/speaking-fixture/fixture-mitigate-us.m4a',
    timings_uk: fixture.timings_uk,
    timings_us: fixture.timings_us,
    is_due: true,
  };
}

const ok = (data: unknown) => ({ success: true, data });

/** A server check: "the" left out, "mitigate" heard as "migrate" (S17 shape). */
const CHECK_RESULT = {
  score: 64,
  stage: 'sprout',
  word_marks: fixture.sentence
    .split(' ')
    .map((_, index) =>
      index === 6
        ? { index, ok: false, reason: 'missing' }
        : index === fixture.target_index
          ? { index, ok: false, reason: 'unclear', heard: 'migrate' }
          : { index, ok: true, reason: null },
    ),
  user_duration_ms: 5200,
  check_ms: 1500,
};

interface Stubs {
  attempts: Array<{ word_marks: Array<Record<string, unknown>> } & Record<string, unknown>>;
  checks: number;
  /** What the next `/speaking/check-speech` answers: the result, or an HTTP status. */
  checkReply: 'ok' | 503;
  checkDelayMs: number;
}

/** Stubs the speaking API; returns what the page sent. */
async function stubSpeakingApi(page: Page, itemCount = 38): Promise<Stubs> {
  const stubs: Stubs = {
    attempts: [],
    checks: 0,
    checkReply: 'ok',
    checkDelayMs: 0,
  };
  await page.context().grantPermissions(['microphone']);
  await page.route('**/api/v1/speaking/session**', (route) =>
    route.fulfill({
      json: ok({
        item_count: itemCount,
        default_accent: 'US',
        items: WORDS.map(item),
      }),
    }),
  );
  await page.route('**/api/v1/speaking/check-speech', async (route) => {
    stubs.checks++;
    if (stubs.checkDelayMs) await new Promise((r) => setTimeout(r, stubs.checkDelayMs));
    if (stubs.checkReply === 503) {
      await route.fulfill({
        status: 503,
        json: { success: false, statusCode: 503, message: 'down' },
      });
    } else {
      await route.fulfill({ json: ok(CHECK_RESULT) });
    }
  });
  await page.route('**/api/v1/speaking/attempts', async (route) => {
    const body = route.request().postDataJSON();
    stubs.attempts.push(body);
    await route.fulfill({
      status: 201,
      json: ok({
        id: `att-${stubs.attempts.length}`,
        created_at: 'now',
        ...body,
      }),
    });
  });
  return stubs;
}

const COUNT_BUTTON = 'Get ready. Recording starts after the beep. Tap to start now';

/** Mic → 3 · 2 · 1 (tapped to skip) → records until the fake mic goes quiet → SP3. */
async function speak(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.getByRole('button', { name: COUNT_BUTTON }).click();
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible();
  await expect(page.getByText('or just pause, it stops by itself')).toBeVisible();
  // The fixture is ~5.6 s, then silence: the recording stops by itself 2 s later.
  await expect(page.getByText('Your sentence')).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('The Pond (/sounds)', () => {
  test('a full session: speak five times (auto-stop), then Done', async ({ page }) => {
    const stubs = await stubSpeakingApi(page);
    await page.goto('/sounds');
    await expect(page.getByText('Speaking · The Pond')).toBeVisible();
    await expect(page.getByText('1/5')).toBeVisible();
    await expect(
      page.getByRole('img', { name: /native speaker saying the sentence/ }),
    ).toBeVisible();

    for (let i = 0; i < WORDS.length; i++) {
      await speak(page);
      await expect(page.getByText(/% match/)).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Next word' }).click();
    }

    await expect(page.getByRole('heading', { name: 'You said 5 words out loud' })).toBeVisible();
    expect(stubs.attempts).toHaveLength(5);
    expect(stubs.attempts[0]).toMatchObject({
      item_id: 'e2e-item-0',
      accent: 'US',
    });
    await page.getByRole('link', { name: 'Back to garden' }).click();
    await expect(page).toHaveURL(/\/missions$/);
  });

  test('server check: checking → marks (missing, heard "migrate"); saved without "heard"', async ({
    page,
  }) => {
    const stubs = await stubSpeakingApi(page);
    stubs.checkDelayMs = 1500;
    await page.goto('/sounds');
    await speak(page);
    test.skip(
      stubs.checks === 0 && !(await page.getByText('Checking your sentence…').isVisible()),
      'app built with NEXT_PUBLIC_SPEECH_CHECK=local',
    );
    await expect(page.getByText('Checking your sentence…')).toBeVisible();
    await expect(page.getByText('Your recording is checked, then deleted.')).toBeVisible();
    await expect(page.getByText('Sprout · 64% match').or(page.getByText(/64% match/))).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('missing')).toBeVisible();
    await expect(page.getByText('heard “migrate”')).toBeVisible();
    await expect.poll(() => stubs.attempts.length).toBe(1);
    const marks = stubs.attempts[0].word_marks;
    expect(marks[6]).toEqual({ index: 6, ok: false, reason: 'missing' });
    expect(marks[fixture.target_index]).toEqual({
      index: fixture.target_index,
      ok: false,
      reason: 'unclear',
    });
  });

  test('server check down: "Couldn\'t check this one", Check again recovers', async ({ page }) => {
    const stubs = await stubSpeakingApi(page);
    stubs.checkReply = 503;
    await page.goto('/sounds');
    await speak(page);
    test.skip(stubs.checks === 0, 'app built with NEXT_PUBLIC_SPEECH_CHECK=local');
    await expect(page.getByText("Couldn't check this one")).toBeVisible({
      timeout: 15_000,
    });
    expect(stubs.attempts).toHaveLength(0);
    stubs.checkReply = 'ok';
    await page.getByRole('button', { name: 'Check again' }).click();
    await expect(page.getByText(/64% match/)).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => stubs.attempts.length).toBe(1);
  });

  test('Try again and Cancel (also during the count)', async ({ page }) => {
    const stubs = await stubSpeakingApi(page);
    await page.goto('/sounds');
    await page.getByRole('button', { name: 'Start recording' }).click();
    await expect(page.getByText('Starting soon')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Start recording' })).toBeVisible();

    await speak(page);
    await expect(page.getByText(/% match/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('1/5')).toBeVisible();
    await page.getByRole('button', { name: COUNT_BUTTON }).click();
    await page.getByRole('button', { name: 'Stop recording' }).click();
    await expect(page.getByText(/% match/)).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => stubs.attempts.length).toBe(2);
  });

  for (const [state, text] of [
    ['mic', 'Dygo needs your microphone'],
    ['denied', 'The microphone is off for Dygo'],
    ['quiet', "We couldn't hear you"],
    ['short', 'Say the whole sentence'],
    ['unsupported', "Speaking isn't available on this browser"],
    ['audioFailed', "Couldn't load the native audio"],
  ] as const) {
    test(`dev toggle ?state=${state}`, async ({ page }) => {
      await stubSpeakingApi(page);
      await page.goto(`/sounds?state=${state}`);
      await expect(page.getByText(text)).toBeVisible();
    });
  }
});
