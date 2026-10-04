import path from 'node:path';

import type { Page } from '@playwright/test';

import { SIGN_IN_SKIP_REASON, expect, hasSignedInSession, test } from './fixtures';

/**
 * Phase 13 The Pond (/sounds) and its entry points, signed in (schedule S12).
 *
 * The microphone is stubbed: Chrome's fake capture device plays the
 * fixture sentence (frontend public/audio/speaking-fixture), and the mic
 * permission is granted up front. The speaking API is stubbed too
 * (`/speaking/session`, `/speaking/attempts`, `/speaking/words`), so the
 * spec writes nothing to the database and doesn't depend on which words
 * the fixture user has. Phone viewports only (the screens are phone
 * layouts). English UI.
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
      `--use-file-for-fake-audio-capture=${path.join(FIXTURE_DIR, 'fixture-mitigate-us.wav')}`,
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

/** Stubs the speaking API; returns the attempts the page tried to save. */
async function stubSpeakingApi(page: Page, itemCount = 38): Promise<unknown[]> {
  const attempts: unknown[] = [];
  await page.context().grantPermissions(['microphone']);
  await page.route('**/api/v1/speaking/session**', (route) =>
    route.fulfill({
      json: { item_count: itemCount, default_accent: 'US', items: WORDS.map(item) },
    }),
  );
  await page.route('**/api/v1/speaking/attempts', async (route) => {
    const body = route.request().postDataJSON();
    attempts.push(body);
    await route.fulfill({ status: 201, json: { id: `att-${attempts.length}`, created_at: 'now', ...body } });
  });
  return attempts;
}

test.describe('The Pond (/sounds)', () => {
  test('a full session: listen, record, compare five times, then Done', async ({ page }) => {
    const attempts = await stubSpeakingApi(page);
    await page.goto('/sounds');
    await expect(page.getByText('Speaking · The Pond')).toBeVisible();
    await expect(page.getByText('1/5')).toBeVisible();
    await expect(page.getByRole('img', { name: /native speaker saying the sentence/ })).toBeVisible();

    for (let i = 0; i < WORDS.length; i++) {
      await page.getByRole('button', { name: 'Start speaking' }).click();
      const stop = page.getByRole('button', { name: 'Stop recording' });
      await expect(stop).toBeVisible();
      await expect(page.getByRole('timer')).toBeVisible();
      await page.waitForTimeout(3500); // let the fake mic play most of the sentence
      await stop.click();
      await expect(page.getByText(/% match/)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Your sentence')).toBeVisible();
      await page.getByRole('button', { name: 'Next word' }).click();
    }

    await expect(page.getByRole('heading', { name: 'You said 5 words out loud' })).toBeVisible();
    expect(attempts).toHaveLength(5);
    expect(attempts[0]).toMatchObject({ item_id: 'e2e-item-0', accent: 'US' });
    await page.getByRole('link', { name: 'Back to garden' }).click();
    await expect(page).toHaveURL(/\/missions$/);
  });

  test('Try again and Cancel', async ({ page }) => {
    const attempts = await stubSpeakingApi(page);
    await page.goto('/sounds');
    await page.getByRole('button', { name: 'Start speaking' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Start speaking' })).toBeVisible();

    await page.getByRole('button', { name: 'Start speaking' }).click();
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: 'Stop recording' }).click();
    await expect(page.getByText(/% match/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible();
    await expect(page.getByText('1/5')).toBeVisible();
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: 'Stop recording' }).click();
    await expect(page.getByText(/% match/)).toBeVisible({ timeout: 15_000 });
    expect(attempts).toHaveLength(2);
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

test.describe('Entry points', () => {
  test('the Missions tab shows the Sound Garden card with ≥ 5 items and opens The Pond', async ({ page }) => {
    await stubSpeakingApi(page, 38);
    await page.goto('/missions');
    const card = page.getByTestId('sound-garden-card');
    await expect(card).toContainText('The Pond · 38 sentences ready');
    await card.click();
    await expect(page).toHaveURL(/\/sounds$/);
    await expect(page.getByText('Speaking · The Pond')).toBeVisible();
  });

  test('no Sound Garden card under 5 items', async ({ page }) => {
    await stubSpeakingApi(page, 4);
    await page.goto('/missions');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('sound-garden-card')).toHaveCount(0);
  });
});
