#!/usr/bin/env node
/**
 * Pronunciation v2, Step C UAT checks (plan section 6) on a phone-sized
 * page: 390 × 844 @2x, iPhone user agent, the signed-in test learner
 * (ui/.auth/user.json, written by `npx playwright test` with .env.e2e),
 * and a recorded take played into the page as the microphone
 * (Chromium --use-file-for-fake-audio-capture). One browser per take.
 *
 *   node pron-v2-uat.mjs [BASE_URL] [OUT_DIR]
 *
 * Takes: docs/reports/pron-v2 step C/audio/*.wav (Google TTS in another
 * voice than the native one; see the Step C report). Screenshots go to
 * OUT_DIR (default docs/reports/pron-v2 step C). Prints one line per check.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const require = createRequire(path.join(process.env.PW_MODULES || HERE, 'package.json'));
const { chromium } = require('@playwright/test');

const BASE = process.argv[2] || 'http://localhost:3000';
const OUT = process.argv[3] || path.join(REPO, 'docs/reports/pron-v2 step C');
const AUDIO = path.join(REPO, 'docs/reports/pron-v2 step C/audio');
const AUTH = process.env.AUTH_FILE || path.join(HERE, '.auth/user.json');
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/** Library words (public beds) with a speaking item and stored stones. */
export const WORDS = {
  sunny: { id: '66b38d17-006e-4ec7-8776-4e092d795eaa' },
  cloudy: { id: 'a157f634-31ea-4ae1-a6bd-f75043b8c149' },
  compensation: { id: 'f58c2fb6-481a-4213-b793-0330e3931143' },
};

const MESSAGES = Object.fromEntries(
  ['en-US', 'vi-VN', 'zh-CN'].map((l) => [
    l,
    JSON.parse(fs.readFileSync(path.join(REPO, `com.dygoacademy.frontend/messages/${l}.json`), 'utf8')).screens,
  ]),
);
let LOCALE = 'en-US';
/** A message in the page's language ("pronounce.result.headPass"), with {vars} filled in. */
const T = (key, vars = {}) =>
  key
    .split('.')
    .reduce((o, k) => o[k], MESSAGES[LOCALE])
    .replace(/\{(\w+)\}/g, (_, k) => String(vars[k]));
/** The garden's language on this page (GardenRoot's lang). */
async function detectLocale(page) {
  await page.locator('[data-ui="garden"]').first().waitFor({ timeout: 30000 });
  const lang = await page.locator('[data-ui="garden"]').first().getAttribute('lang');
  LOCALE = MESSAGES[lang] ? lang : 'en-US';
}

const results = [];
const check = (name, ok, note = '') => {
  results.push({ name, ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? `  (${note})` : ''}`);
};

async function open(take) {
  const browser = await chromium.launch({
    channel: process.env.CHROME_PATH ? undefined : 'chrome',
    executablePath: process.env.CHROME_PATH || undefined,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${path.join(AUDIO, take)}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const context = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: IPHONE,
    isMobile: true,
    hasTouch: true,
    permissions: ['microphone'],
  });
  await context.addCookies([{ name: 'dygo_ui', value: 'garden', url: BASE }]);
  // Every object URL the page makes (the take), to check it's gone after P4.
  await context.addInitScript(() => {
    window.__blobs = [];
    const make = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (o) => {
      const u = make(o);
      window.__blobs.push(u);
      return u;
    };

  });
  const page = await context.newPage();
  page.on('console', (m) => m.text().startsWith('still readable') && console.log(m.text()));
  return { browser, page };
}

const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

/** P1 → tap the mic → P2 → (auto-stop) → P3 → P4 or P2b. */
async function say(page, prefix) {
  await detectLocale(page);
  const mic = page.getByRole('button', { name: T('pronounce.startSpeaking') }).first();
  await mic.waitFor({ timeout: 30000 });
  await shot(page, `${prefix}-P1`);
  await mic.click();
  await page.getByRole('button', { name: T('pronounce.stopRecording') }).first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(700);
  await shot(page, `${prefix}-P2`);
  const ends = [
    page.locator('[data-screen="p4"]'),
    page.getByText(T('pronounce.notHeard.other.title')),
    page.getByText(T('pronounce.notHeard.quiet.title')),
    page.getByText(T('pronounce.notHeard.noisy.title')),
    page.getByRole('button', { name: T('speak.failed.checkAgain') }),
  ];
  await ends.reduce((a, l) => a.or(l)).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
}

const url = (ids, topic) => `${BASE}/sounds/word?words=${ids.join(',')}${topic ? `&topic=${topic}` : ''}`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // 1. sunny, a pass on the last bee.
  {
    const { browser, page } = await open('sunny-good.wav');
    await page.goto(url([WORDS.sunny.id]), { waitUntil: 'networkidle' });
    await say(page, '1-sunny');
    const p4 = page.locator('[data-screen="p4"]');
    const clean = await p4.getByText(T('pronounce.result.headPass')).count();
    const back = await p4.getByRole('link', { name: T('pronounce.result.backToBed') }).count();
    const again = await p4.getByRole('button', { name: T('pronounce.result.sayAgain') }).count();
    const bee = await p4.getByText(T('pronounce.beeCount', { n: 1, total: 1 })).count();
    await shot(page, '1-sunny-P4');
    check('1 sunny: pass on the last bee (Clean crossing!, Back to the bed, Say it again, Bee 1 of 1)', clean && back && again && bee > 0);
    // 7. P4 pills are SoundButtons with loading / playing.
    const native = p4.getByRole('button', { name: T('pronounce.result.playNative') });
    await native.click();
    await page.waitForTimeout(150);
    const nat = await native.getAttribute('data-sound');
    await shot(page, '7-P4-native-playing');
    check('7 P4 Native pill is a SoundButton (loading or playing after a tap)', nat === 'loading' || nat === 'playing', `data-sound=${nat}`);
    // 6. Leaving P4 deletes the take on the phone.
    const blobs = await page.evaluate(() => window.__blobs);
    await p4.getByRole('link', { name: T('pronounce.result.backToBed') }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/sounds'), { timeout: 15000 });
    const alive = await page.evaluate(async (us) => {
      let n = 0;
      for (const u of us) {
        try {
          const b = await (await fetch(u)).blob();
          console.log(`still readable: ${u} ${b.type} ${b.size} at ${location.pathname}; p4 in DOM: ${!!document.querySelector('[data-screen="p4"]')}`);
          n += 1;
        } catch {
          // revoked: gone
        }
      }
      return n;
    }, blobs);
    check('6 the take is gone from the phone after leaving P4', blobs.length > 0 && alive === 0, `${blobs.length} take URL(s), ${alive} still readable`);
    await browser.close();
  }

  // 2. compensation: 4 stones, SA big; middle bee → Next bee: sunny. 7. P1 Hear it.
  {
    const { browser, page } = await open('compensation-good.wav');
    await page.goto(url([WORDS.compensation.id, WORDS.sunny.id]), { waitUntil: 'networkidle' });
    await detectLocale(page);
    await page.getByRole('button', { name: T('pronounce.startSpeaking') }).first().waitFor({ timeout: 30000 });
    const pond = await page
      .getByRole('img', { name: T('pronounce.pond.say', { list: 'com, pen, SA, tion', big: 'SA' }) })
      .count();
    check('2 compensation: 4 stones, SA the big one (P1)', pond > 0);
    const hear = page.getByRole('button', { name: T('pronounce.hearIt'), exact: true }).first();
    await hear.click();
    await page.waitForTimeout(150);
    const h = await hear.getAttribute('data-sound');
    await shot(page, '7-P1-hear-it');
    check('7 P1 Hear it is a SoundButton (loading or playing after a tap)', h === 'loading' || h === 'playing', `data-sound=${h}`);
    await hear.click(); // a tap while playing stops it
    await say(page, '2-compensation');
    const p4 = page.locator('[data-screen="p4"]');
    const chips = await p4.locator('[data-chip]').count();
    const next = await p4.getByRole('button', { name: T('pronounce.result.nextBee', { word: 'sunny' }) }).count();
    await shot(page, '2-compensation-P4');
    check('2 compensation: P4 with 4 chips and Next bee: sunny', chips === 4 && next > 0, `${chips} chips`);
    await browser.close();
  }

  // 5. cloudy said as "cloud" → P2b other word, no playback, Try again records.
  {
    const { browser, page } = await open('cloudy-as-cloud.wav');
    await page.goto(url([WORDS.cloudy.id]), { waitUntil: 'networkidle' });
    await say(page, '5-cloudy');
    const other = await page.getByText(T('pronounce.notHeard.other.title')).count();
    const heard = await page.getByText(T('pronounce.notHeard.other.body', { heard: 'cloud', word: 'cloudy' })).count();
    const players = await page.locator('[data-sound]:visible').count();
    await shot(page, '5-cloudy-P2b');
    check('5 cloudy as cloud: P2b other word, "We heard cloud", no playback buttons', other > 0 && heard > 0 && players === 0, `${players} sound buttons`);
    await page.getByRole('button', { name: T('pronounce.tryAgain') }).first().click();
    const rec = await page.getByRole('button', { name: T('pronounce.stopRecording') }).first().waitFor({ timeout: 10000 }).then(() => true, () => false);
    check('5 Try again from P2b records straight away', rec);
    await browser.close();
  }

  // 6. A quiet take → P2b, nothing sent, doesn't count.
  {
    const { browser, page } = await open('quiet.wav');
    const sent = [];
    page.on('request', (r) => r.url().includes('/speaking/check-pronunciation') && sent.push(r.url()));
    await page.goto(url([WORDS.sunny.id]), { waitUntil: 'networkidle' });
    await say(page, '6-quiet');
    const quiet = await page.getByText(T('pronounce.notHeard.quiet.title')).count();
    const counts = await page.getByText(T('pronounce.doesntCount')).count();
    await shot(page, '6-quiet-P2b');
    check('6 quiet take: P2b "We couldn\'t hear you", doesn\'t count, nothing sent', quiet > 0 && counts > 0 && sent.length === 0, `${sent.length} upload(s)`);
    await browser.close();
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ locale: LOCALE, results }, null, 2));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
