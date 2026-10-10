#!/usr/bin/env node
/**
 * Word Garden pixel diff (Phase 12, UI-fidelity 4; docs/design/garden/README.md).
 *
 * Screenshots every canvas reference page (/garden/_reference/<name>) at
 * the reference's own size (its PNG's width/2 × height/2: 390 × 844 for
 * the A/GR/AU/Q screens, the full board for the home pages H3/H4 and the H3s state boards; HP-2, HP-11),
 * device scale factor 2, animations and transitions off, and
 * diffs it against docs/design/garden/reference/<name>.png with pixelmatch
 * (threshold 0.1). Pass = at most 0.5% of pixels differ.
 *
 * Usage (with `npm run dev` running):
 *   npm run garden:diff -- --base http://localhost:3000 --cookie dygo_ui=garden --locale en-US,vi-VN
 *
 * Options:
 *   --base <url>       app URL (default http://localhost:3000)
 *   --cookie <n=v>     cookie to send, repeatable (default dygo_ui=garden)
 *   --only <name,…>    only these references
 *   --out <dir>        where actual + diff PNGs go (default .garden-diff, gitignored)
 *   --chrome <path>    Chrome/Chromium binary (or CHROME_PATH); default: installed Chrome
 *   --max <percent>    pass threshold (default 0.5)
 *   --locale <l,…>     locales to check: en-US (default), vi-VN, or
 *                      "en-US,vi-VN" (the old `en` / `vi` still work).
 *                      `vi-VN` screenshots /garden/_reference/<name>?locale=vi-VN
 *                      and diffs it against reference/<name>-vi.png. (zh-CN
 *                      and en-US have no canvas page; they're checked by
 *                      screenshots instead.)
 *   --refs <dir>       reference PNGs (default ../docs/design/garden/reference)
 *
 * The reference pages exist only in development (they 404 in production)
 * and need the garden flag or cookie. Never edit the reference PNGs to make
 * a diff pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

import { DEVICE_SCALE_FACTOR, referenceViewport } from './garden-diff-size.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '..');
const defaultReferenceDir = path.resolve(frontend, '../docs/design/garden/reference');

const NAMES = [
  'A1-todays-garden',
  'A2-review-question',
  'A2-review-answer',
  'A2-review-finished',
  'A3-mission-complete',
  'A4-weekly-harvest',
  'A5-welcome-back',
  'A5b-welcome-back-start',
  'A6-topics',
  'A7-topic-bed',
  'A7-topic-bed-filter-sprouts',
  'A8-me',
  'A8-me-account',
  // UI-G
  'GR1-shared-gardens',
  'GR2-group-garden',
  'GR3-tricky-patches',
  'GR4-gardeners',
  'GR5-invite',
  'GR6-join',
  'GR7-create',
  // UI-A
  'AU1-sign-in',
  'AU1-sign-in-error',
  'AU2-create-account',
  'AU3-create-account-invite',
  'AU4-reset-password',
  'AU4-reset-password-sent',
  // UI-5 quiz
  'Q1-quiz-choose',
  'Q2-quiz-right',
  'Q3-quiz-not-quite',
  'Q4-quiz-cloze-hint',
  'Q5-quiz-listen',
  'Q6-quiz-result',
  'Q7-quiz-result-perfect',
  'Q8-quiz-drill-done',
  // Home page v2 (HP-11, full boards, sizes from each PNG). The v1 boards
  // H1/H2 are retired from the diff; their fixtures and PNGs stay.
  'H3-home-v2-phone',
  'H4-home-v2-desktop',
  'H3s-plant-bloomed',
  'H3s-pain-flipped',
  'H3s-uses-travel',
  // Phase 13 speaking (handover v2; SP1 / SP4 references exist, fixtures to come)
  'SP2-speak-countdown',
  'SP2-speak-recording',
  'SP3-speak-checking',
  'SP3-speak-done',
  'SP3-speak-failed',
  // Phase 13 speaking entry points (boards drafted by Claude Code, 2026-10-06)
  'SE1-entry-home',
  'SE2-entry-bed',
  'SE5-entry-harvest',
  'SE6-entry-echo',
];

/** Old short codes still accepted on the command line. */
const LOCALE_ALIASES = { en: 'en-US', vi: 'vi-VN' };
/** Suffix of the reference PNGs per locale (the canvas pages are English and Vietnamese). */
const REFERENCE_SUFFIX = { 'vi-VN': 'vi' };

function parseArgs(argv) {
  const args = {
    base: 'http://localhost:3000',
    cookies: [],
    only: null,
    out: '.garden-diff',
    chrome: null,
    max: 0.5,
    refs: defaultReferenceDir,
    locales: ['en-US'],
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    switch (key) {
      case '--base':
        args.base = value.replace(/\/$/, '');
        i++;
        break;
      case '--cookie':
        args.cookies.push(value);
        i++;
        break;
      case '--only':
        args.only = value.split(',').map((s) => s.trim());
        i++;
        break;
      case '--out':
        args.out = value;
        i++;
        break;
      case '--chrome':
        args.chrome = value;
        i++;
        break;
      case '--refs':
        args.refs = path.resolve(value);
        i++;
        break;
      case '--locale':
        args.locales = value.split(',').map((s) => LOCALE_ALIASES[s.trim()] ?? s.trim());
        i++;
        break;
      case '--max':
        args.max = Number(value);
        i++;
        break;
      case '--help':
      case '-h':
        console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
        process.exit(0);
        break;
      default:
        console.error(`Unknown option ${key}`);
        process.exit(2);
    }
  }
  if (args.cookies.length === 0) args.cookies.push('dygo_ui=garden');
  return args;
}

// Same freeze as docs/design/garden/tools/render.js, plus the dev-only
// overlays (Next's dev indicator, the TanStack Query devtools button).
const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important}' +
  'nextjs-portal,.tsqd-parent-container{display:none!important}';

/**
 * Fixture pages whose reference PNGs were renamed (2026-10-08: `home-v2` →
 * `landing-v2`, docs/design/garden/README.md). The fixture keeps its old name
 * on the site; the PNG and the table row use the new one. `--only` takes either.
 */
const REFERENCE_FILE = {
  'H3-home-v2-phone': 'H3-landing-v2-phone',
  'H4-home-v2-desktop': 'H4-landing-v2-desktop',
};
const FIXTURE_FOR = Object.fromEntries(Object.entries(REFERENCE_FILE).map(([fixture, ref]) => [ref, fixture]));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const names = (args.only ?? NAMES).map((n) => FIXTURE_FOR[n] ?? n);
  const outDir = path.resolve(frontend, args.out);
  fs.mkdirSync(outDir, { recursive: true });

  const executablePath = args.chrome ?? process.env.CHROME_PATH ?? undefined;
  const browser = await chromium.launch({
    executablePath,
    channel: executablePath ? undefined : 'chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const url = new URL(args.base);
  await context.addCookies(
    args.cookies.map((cookie) => {
      const [name, ...rest] = cookie.split('=');
      return { name, value: rest.join('='), domain: url.hostname, path: '/' };
    }),
  );
  const page = await context.newPage();

  const rows = [];
  const jobs = args.locales.flatMap((locale) => names.map((name) => ({ locale, name })));
  for (const { locale, name: screen } of jobs) {
    // Reference PNGs: English is <name>.png (drawn in en-US), Vietnamese <name>-vi.png.
    const base = REFERENCE_FILE[screen] ?? screen;
    const name = locale === 'en-US' ? base : `${base}-${REFERENCE_SUFFIX[locale] ?? locale}`;
    const refPath = path.join(args.refs, `${name}.png`);
    if (!fs.existsSync(refPath)) {
      rows.push({ name, error: 'no reference PNG' });
      continue;
    }
    // HP-2: the viewport is the reference board (PNG size / DPR), so the
    // phone screens stay 390 × 844 and the home pages are shot whole.
    const size = referenceViewport(refPath);
    await page.setViewportSize(size);
    const response = await page.goto(`${args.base}/garden/_reference/${screen}?locale=${locale}`, {
      waitUntil: 'load',
    });
    if (!response || response.status() !== 200) {
      rows.push({ name, error: `HTTP ${response ? response.status() : 'no response'}` });
      continue;
    }
    // The page streams in: wait until React has revealed the garden (its
    // stylesheets are loaded) before freezing and shooting.
    await page.waitForSelector('[data-ui="garden"]', { state: 'visible' });
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.evaluate(async () => {
      await document.fonts.ready;
      // An autofocused button (e.g. the quiz's Next) shows a focus ring when the
      // page was opened without a mouse; real learners tap first, so no ring.
      const active = document.activeElement;
      if (active instanceof HTMLButtonElement) active.blur();
    });
    await page.waitForTimeout(250);
    const shot = await page.screenshot({
      clip: { x: 0, y: 0, width: size.width, height: size.height },
    });
    fs.writeFileSync(path.join(outDir, `${name}.actual.png`), shot);

    const actual = PNG.sync.read(shot);
    const reference = PNG.sync.read(fs.readFileSync(refPath));
    if (actual.width !== reference.width || actual.height !== reference.height) {
      rows.push({
        name,
        error: `size ${actual.width}×${actual.height} ≠ ${reference.width}×${reference.height}`,
      });
      continue;
    }
    const diff = new PNG({ width: reference.width, height: reference.height });
    const pixels = pixelmatch(
      actual.data,
      reference.data,
      diff.data,
      reference.width,
      reference.height,
      {
        threshold: 0.1,
      },
    );
    fs.writeFileSync(path.join(outDir, `${name}.diff.png`), PNG.sync.write(diff));
    rows.push({ name, percent: (100 * pixels) / (reference.width * reference.height), pixels });
  }
  await browser.close();

  let failed = 0;
  console.log(
    `\nWord Garden pixel diff (pass ≤ ${args.max}%), images in ${path.relative(process.cwd(), outDir) || '.'}\n`,
  );
  console.log('| Reference | Differing pixels | % | Result |');
  console.log('| --- | ---: | ---: | --- |');
  for (const row of rows) {
    if (row.error) {
      failed++;
      console.log(`| ${row.name} | — | — | ERROR: ${row.error} |`);
      continue;
    }
    const pass = row.percent <= args.max;
    if (!pass) failed++;
    console.log(
      `| ${row.name} | ${row.pixels} | ${row.percent.toFixed(3)} | ${pass ? 'pass' : 'FAIL'} |`,
    );
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
