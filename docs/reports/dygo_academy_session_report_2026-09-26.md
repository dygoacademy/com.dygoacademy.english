# Dygo Academy — session report, 2026-09-26

## Pass 1: Phase 12 UI-2 components (automated, 2026-09-25 22:22 UTC)

**Run**: scheduled task "Dygo Phase 12: continue UI-2 components", no user present.
**Plan followed**: `docs/plans/phase 12 implementation plan.md` §1, §4, §5 (UI-2) and §10 (rules for automated passes).
**Result**: every UI-2 component is built, in `/garden/_gallery` in every state, with a Vitest runner and 131 passing tests. Stopped at gate G1; UI-3 not started. Classic UI unchanged.

### Commits (frontend only; nothing in the backend or `database/`)

| Commit | Part | What |
| --- | --- | --- |
| `f06702b` | UI-2 (part 2) | `PlantGlyph`, `stageFromSrs`, `RatingBar`, shared icons, garden keyframes, Vitest + Testing Library + jsdom, first tests |
| `6ed48f0` | UI-2 (part 3) | Garden `AudioButton`, `ReviewCard` |
| `7a8be4e` | UI-2 (part 4) | `MissionRow`, `HeroGardenCard`, `StageTile`, `WordRow`, `--color-forest-muted` token; Prettier on the UI-2 files |
| `1063de0` | UI-2 (part 5) | `BottomTabBar`, `BottomSheet`, `Toast`; `Button` made a client component (fix); 44px hit areas on `Chip` / `Switch` |

Each commit staged exact paths only. `git status` showed 111 entries before and after the pass (the other work in the tree was not touched). Not committed on purpose: `docs/plans/phase 12 implementation plan.md` (it's untracked, so the whole file is uncommitted and not mine to commit), `docs/product/dygo_academy_master_project_schedule.md` (has your own edits; changelog line 5.50 added). This report is committed on its own as a `docs:` commit.

### Components built (`src/components/garden/`)

- **`PlantGlyph`**: seed, sprout, flower, tree, wilting and the thirsty drop, at 24/32/40/56/72. Colours only from the §5.2 stage tokens, and every stage has its own shape. Decorative (`aria-hidden`) by default; `role="img"` + `aria-label` when labelled. `animate="drip"` (ambient loop) and `animate="bloom"` (.6 → 1.06 → 1, once). Under reduced motion the drip stops and bloom becomes a 150ms fade (`garden-*` keyframes in `globals.css`).
- **`stageFromSrs(fsrs_state, mastered_at, is_leech)`** in `plantStage.ts` (pure, no React): leech → wilting (wins), then mastered_at set → tree, then New → seed, Learning/Relearning → sprout, Review → flower. Never returns `thirsty`: due-now is an overlay decided from `next_due_at`. Throws on an unknown state.
- **`RatingBar`**: Again / Hard / Good / Easy with the `rating-*` pairs, h 68, an interval label per button (a prop). `disabled` disables the buttons and the keys and sets `aria-busy`. Keys 1–4 on `window`, ignored in text fields, with modifier keys, on key repeat, or while disabled. Key hints show after any key press and hide on the next tap. `aria-keyshortcuts` on each button. Exports `RATING_GRADE` (1–4) for the API.
- **`ReviewCard`**: tags (level, topic, part of speech) → word (`display-xl`) + IPA + audio → answer (meaning, optional meaning-language line with its own `lang`, example with the word bolded, collocations). The answer isn't in the DOM until shown, then rises in. English text has `lang="en"`. Props only.
- **`AudioButton` (garden)**: the classic playback logic (one `Audio` per src, restart from 0, `stopPropagation`), plus an "Audio unavailable, tap to retry" pill (gold-soft) when loading or playing fails; retry builds a fresh `Audio`. No src → disabled "No audio for this word". `flashcard/AudioButton.tsx` is unchanged.
- **`MissionRow`**: 40px icon circle, title, 6px progressbar with `aria-valuetext`, right value. todo / in progress / done (strike-through, check icon, and "Done" in words for VoiceOver).
- **`HeroGardenCard`**: normal (forest) and comeback (`bg-garden-forest-muted` #34453D, rain cloud, desaturated plants). Text-free decorative illustration, 6 plants on iPhone and up to 12 (larger) from 600px, and a legend row that carries the counts as text.
- **`StageTile`**: h 92 toggle button with `aria-pressed`; decorative glyph, count, label.
- **`WordRow`**: normal, due now (blue due text, dripping glyph), wilting (gold-soft). The glyph is labelled with its stage. Whole row is one link (`href`), a button (`onClick`), or static.
- **`BottomTabBar`**: labelled `<nav>`, 4 links, `aria-current="page"` + forest pill + bold label on the active tab, 56px + safe area. Props only; `fixed={false}` for the gallery.
- **`BottomSheet`**: uses `Dialog`, `DialogPortal` and `DialogOverlay` from `components/ui/dialog.tsx` (unchanged) with its own Radix `Content`. Bottom sheet on iPhone (radius-xl top corners, 36×5 grabber, max 90dvh, safe-area padding, drag the grabber down more than 96px to close); centred sheet from 600px. It portals into the `[data-ui="garden"]` root, so tokens and fonts apply inside it.
- **`Toast`**: forest, `body-m`, radius-md, info / success, closes after 3s. Bottom (above the tab bar) on iPhone, top-centre from 600px. The `role="status"` region is always mounted so each message is announced.
- **`icons.tsx`**: shared decorative icons (speaker, retry, check, close, info, the four tab icons, mission icons).

All strings go through `t()`; new keys are under `components.*` and `gallery.*` in `messages/en.json` (typed automatically through `src/types/next-intl.d.ts`). No raw hex in components; the one new colour is a token.

### Test runner

- `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`; devDependencies `vitest ^5.0.2`, `@vitejs/plugin-react ^6.1.1`, `@testing-library/react ^16.3.3`, `@testing-library/dom ^10.4.2`, `jsdom ^26.1.0` (26, not 30, because 30 needs Node 22.22+ and the Dockerfile uses Node 20).
- `vitest.config.ts` (jsdom, `@` alias, `src/**/*.test.{ts,tsx}`), `src/test/setup.ts` (cleanup + a PointerEvent polyfill for jsdom), `src/test/render.tsx` (`renderWithIntl`, English messages as a wrapper).
- **Install:** your Mac's `node_modules` was **not** touched. I ran the install in a Linux scratch copy outside the repo and copied back only `package.json` and `package-lock.json`. The lockfile change is additive (100 new packages, all platforms' optional binaries listed) except `postcss` 8.5.26 → 8.5.28, which Vite 8 pulled up.
- Tests (131, 10 files): `stageFromSrs` (every state × mastered_at × is_leech, 80 combinations, plus edge cases), `RatingBar` (tap, keys 1–4, ignored keys, text fields, disabled while saving, re-enable, key hints, `aria-keyshortcuts`), `Switch` and `StageTile` ARIA, `PlantGlyph` (every stage × size, labelled vs decorative), `ReviewCard`, `MissionRow`, `BottomTabBar`, `BottomSheet` (name, close, drag), `Toast` (live region, 3s timer).

### Checks and results

All run in the Linux scratch copy (the working tree mirrored, including the other uncommitted work, with Linux `node_modules`):

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Clean after every part, on the working tree and on a clean `git archive HEAD` export |
| `next lint` | "No ESLint warnings or errors" after every part |
| `vitest run` | 131 passed, on the working tree and on the `HEAD` export |
| `next build` | **Passed** (all routes plus middleware), with `fonts.ts` stubbed in the scratch copy because Google Fonts returns 403 from the sandbox |
| Classic CSS | Compiled Tailwind over all of `src/` with the pre-pass garden files vs now: 0 removed or changed lines, only additions |
| Render at 390×844 and 820×1180 | `next dev` in the scratch copy (auth guard bypassed there only, fallback fonts), streamed HTML rendered in headless Chromium. No horizontal scroll at either width. Rating buttons 84×68 (iPhone) / 162×68 (iPad); tab items 90×56 / 140×56. The only controls under 44px were the part-1 chips (38) and switches (32), now fixed with invisible hit areas. |
| `tsc` in the real repo | **Fails until you run `npm install`**: the test files import `vitest` and `@testing-library/react`, which aren't in the Mac's `node_modules` yet. `next build` will fail the same way until then. |

**Bug found and fixed:** the part-1 `Button` wasn't a client component but attaches a click handler, so rendering it from a server page (the gallery) raised "Event handlers cannot be passed to Client Component props" in `next dev`. It's now `'use client'`.

### Not verified here

- Real Fraunces / Be Vietnam Pro rendering (fallback fonts in the sandbox).
- Audio playback and the retry state in a real browser (jsdom has no media playback; the gallery's test tone is an inlined 0.3s WAV).
- Sheet drag feel, animations, and reduced motion on a device.
- VoiceOver reading order and keyboard use on iPad.
- Side-by-side with the mockups: the PNGs aren't in `docs/design/garden/`.

### Assumptions

1. `stageFromSrs` uses its own `GardenFsrsState` type (`'New' | 'Learning' | 'Review' | 'Relearning'`) instead of importing `FsrsState` from `types/srs.ts`, because that type is in the uncommitted Phase 10 work and importing it would break the commit on its own. They're structurally identical; swap once Phase 10 is committed.
2. Mastery beats state: a mastered word in Relearning stays a tree (Phase 10's sticky mastery). A leech beats everything.
3. `RatingBar.onRate` returns the rating name (`'again'` …); `RATING_GRADE` maps it to 1–4 for `POST /srs/rate`.
4. Intervals, counts and due text are passed in formatted; no component formats dates or numbers.
5. The comeback hero colour (#34453D, §11) became a token, `--color-forest-muted` / `bg-garden-forest-muted`.
6. The tab bar is props-only (items + active key); the four routes and the active-tab logic belong to the UI-3 shell.
7. The bottom sheet uses the ui/dialog `Root`, `Portal` and `Overlay` but its own `Content`, because `DialogContent` is centred with classic styling and `cn()` would drop the garden type classes.
8. The iPad two-pane review card (landscape) and tab rail / sidebar are left for UI-3 / UI-7, as the plan says.
9. Prettier isn't configured in the repo; I used the style the existing garden files already follow (single quotes, width 100, trailing commas).

### Things to know

- The pass had to request access to the repo folder at the start (the session had no connected folder); it was granted.
- git can't unlink its lock files from this sandbox, so each stale `index.lock` / `HEAD.lock` was moved into `.git/stale-locks/`. Safe to delete on your Mac.
- The render snapshot is at `com.dygoacademy.frontend/.next/garden-snapshot/gallery-ui2.html` (gitignored, safe to delete).

### Next open item

**Gate G1**, which needs you: export the 8 adult mockups as 390×844 PNGs into `docs/design/garden/`, then compare `/garden/_gallery` side by side, try it by keyboard, and run VoiceOver on a real iPhone. After G1, UI-3 starts with adding `/garden` to `PROTECTED_PATH_PREFIXES`.

### What to check on your Mac

1. `cd com.dygoacademy.frontend && npm install && npm test` (expect 131 passing), then `npx tsc --noEmit` and `npm run build`.
2. `npm run dev`, open `/garden/_gallery?ui=garden` signed in, at iPhone width: plant glyphs, rating bar (press 1–4 on a keyboard; the key hints appear), audio (the first button plays a short tone; the "broken file" one turns into the retry pill), review card toggle, sheets (drag the grabber down), toasts.
3. The same page at iPad width: the sheet is centred, the toast is at the top, the hero shows 12 plants.
4. `/?ui=classic`: the app is exactly as before.

## Pass 2: canvas fidelity, all 8 adult screens (automated, 2026-09-26 03:26 UTC)

Scheduled task "Dygo Phase 12: build all garden screens to match the canvas (pass 1)". Goal: every adult Word Garden screen matches the design canvas at 390 × 844, proven by pixel diff against `docs/design/garden/reference/*.png`. An earlier firing had already committed `docs/design/garden/` and step 1 (fonts); I verified both and continued from step 2. Frontend only; nothing in the backend or `database/`.

### Commits

| Commit | Step |
| --- | --- |
| `01c3e8f` | docs: Word Garden canvas references (earlier firing; verified) |
| `6917965` | UI-fidelity (1): DM Sans + Be Vietnam Pro fallback, Fraunces opsz, self-hosted with `next/font/local` (earlier firing; verified: the fixture pages render with exactly the reference fonts, see the noise-floor column below) |
| `061a08d` | UI-fidelity (2): components match the canvas values and drawings (30 new colour tokens, canvas keyframes, `PlantGlyph` / `HeroGardenCard` / `icons.tsx` redrawn from the canvas paths, every component re-measured; new StreakPill, TopicRow, GardenCalendar, WeekDots, WeekHarvest, Keepsake, SettingsList) |
| `afe8fd0` | UI-fidelity (3): the eight screens as presentational components in `src/components/garden/screens/` (A6 chips, A7 stage filter and A8 switch work) |
| `4341851` | UI-fidelity (4): `/garden/_reference/<name>` for all 11 references + `npm run garden:diff` (`scripts/garden-diff.mjs`) |
| `0d48161` | UI-fidelity (5): diff results; `docs/design/garden/README.md` gets how to run it, the table, and the two canvas quirks |
| `c42b5b3` | UI-fidelity (6): the live routes `/garden`, `/garden/review`, `/garden/review/done`, `/garden/missions`, `/garden/topics`, `/garden/topics/[id]`, `/garden/me` on existing hooks only |
| (this report) | UI-fidelity (7): session report |

Each commit was checked on its own with `git archive <commit>` (committed files only, so nothing leans on the uncommitted Phase 10 work): `tsc --noEmit` clean and Vitest green every time.

### Pixel diff, final

`npm run garden:diff` against `next dev`, headless Chromium 153 (Linux, arm64), 390 × 844 @2x, animations off, pixelmatch threshold 0.1. **Noise floor** = the reference HTML itself rendered in the same browser with the same fonts (this Chromium anti-aliases text a little differently from the one that made the PNGs), i.e. what a pixel-perfect page scores here.

| Reference | Diff | Noise floor | Result |
| --- | ---: | ---: | --- |
| A1-todays-garden | 0.153% | 0.153% | pass, at the floor |
| A2-review-question | 0.074% | 0.074% | pass, at the floor |
| A2-review-answer | 0.258% | 0.131% | pass (one Vietnamese line) |
| A2-review-finished | 0.022% | 0.021% | pass, at the floor |
| A3-mission-complete | 0.134% | 0.133% | pass, at the floor |
| A4-weekly-harvest | 0.293% | 0.293% | pass, at the floor |
| A5-welcome-back | 0.184% | 0.184% | pass, at the floor |
| A6-topics | 0.221% | 0.221% | pass, at the floor |
| A7-topic-bed | **0.741%** | 0.254% | **over 0.5%, Vietnamese glyphs only** |
| A7-topic-bed-filter-sprouts | 0.324% | 0.139% | pass (Vietnamese lines) |
| A8-me | 0.271% | 0.236% | pass ("Tiếng Việt") |

**A7 is the one screen over 0.5%, and only because of the font decision.** The canvas draws Vietnamese letters that DM Sans lacks (ạ, ả, ấ, ộ…) in the system fallback font; the app uses Be Vietnam Pro for them, as decided. A7 has 11 Vietnamese meanings. With the body stack cut to DM Sans only (scratch copy, not committed) A7 scores 0.263%, A7-sprouts 0.147%, A8 0.238% and A2-answer 0.131%: the noise floor, so nothing else differs. I didn't change the decision or the references.

What the iteration found and fixed (all folded into commits 2 and 4): links vs buttons (browsers size `<a>` content-box and `<button>` border-box, so the canvas's Close / Back are 46px while Search / Options are 44px; Quiz 54px next to Add 52px); the A8 settings rows are 52px + divider; the Fruiting stage tile's SVG shrinks slightly in the canvas; the TanStack Query devtools button and Next's dev indicator had to be hidden in the screenshots.

### Live routes (step 6)

Real data only where a committed hook already provides it: `useSrsStats` (streak, words, due, mastered, leeches), `useDailyActivity` (A5 after 2+ missed days; A3 week dots), `useStudySession` + `useRateWord` (the review session, offline queue included), `useTopics` / `useTopic` + the topic's due cards (A6, A7), `useNotificationSchedules` + `useUpsertSchedule` (A8 reminder). Everything else is "coming soon", "—" or left out. Rendered every route in headless Chromium against a mock API (auth bypass in the scratch mirror only), including A5 with a 4-day gap; no console errors.

### Checks

| Check | Result |
| --- | --- |
| `tsc --noEmit` (app and `tsconfig.test.json`) | Clean, on the working tree and on every commit's `git archive` |
| `next lint` | No warnings or errors |
| `vitest run` | 150 passed, 12 files (new: screens, fixtures, live helpers, PlantGlyph variants) |
| `next build` (production, scratch mirror) | Passes with the self-hosted fonts, no Google Fonts needed |
| Reference pages in production | `next start`: `/garden/_reference/*` returns 404 even with the garden cookie |
| Classic UI | Unchanged: new CSS is under `[data-ui="garden"]` or `garden-` keyframes, Tailwind additions are `garden-*` colours, the middleware change only affects `/garden/_reference` in production |

### Not verified here

- The diff on your Mac: macOS Chrome renders text differently from Linux Chromium, so expect every screen to sit a bit higher than the table above. If a screen is well over 0.5% there, compare it with the noise floor by rendering the reference HTML in the same Chrome (`docs/design/garden/tools/render.js`).
- Signed-in flows against the real API (the live routes were checked against a mock API), audio playback, VoiceOver, iPad widths, and animations (the diff freezes them).

### Assumptions

1. Where the canvas contradicts itself on sizes (content-box links vs border-box buttons), I reproduced the rendered result, since the PNG is the reference.
2. The canvas's placeholder copy is fixture data, not UI copy: "[ETA]", "[add date]" and "Replay demo" appear only on the reference pages.
3. The hero garden on live pages is drawn from the learner's real counts (share of trees, wilting, thirsty), not from individual words; the legend carries the numbers.
4. "Missed 2+ days" = at least two whole days between the last day with reviews and today; a learner with no reviews in the last 30 days doesn't see Welcome back.
5. On the live A7, new words are seeds and other due words sprouts until UI-5 adds per-word stages; words not due show no date.
6. A5's "Quick revive" opens the existing leech drill (`/quiz?mode=leech`); "Plant a new bed", Add word, Quiz and Options open the classic pages.
7. `/garden` is still not in `PROTECTED_PATH_PREFIXES` (`routes.ts` has someone else's edits). The (garden) layout redirects anonymous visitors server-side and the new pages fetch user data only client-side, so no user data renders on the server yet.

### Things to know

- `package.json` gains `garden:diff` and devDependencies `playwright-core`, `pixelmatch`, `pngjs` (lockfile: 3 additions). Your Mac's `node_modules` was not touched: run `npm install`. The diff uses your installed Chrome (`channel: 'chrome'`), or `--chrome` / `CHROME_PATH`.
- git in this sandbox can't unlink its temp files: stale `index.lock` files were moved into `.git/stale-locks/`, and a few `tmp_obj_*` files are left in `.git/objects/`. Both are safe to delete (`git gc` removes the second kind).
- `com.dygoacademy.frontend/.garden-diff/` holds the diff images and a few side-by-side PNGs from this pass (gitignored, safe to delete).

### Next open item

Gate **G1** for you: run the diff on your Mac and look at `/garden/_reference/*` next to the PNGs. After that, UI-4's backend additions (interval previews on each due card, plant-stage counts in `/srs/stats`), which turn the first "coming soon" states into real data, and adding `/garden` to `PROTECTED_PATH_PREFIXES` once `routes.ts` is committed.

### What to check on your Mac

1. `cd com.dygoacademy.frontend && npm install && npm test` (expect 150 passing), then `npx tsc --noEmit`.
2. `npm run dev`, then open `/garden/_reference/A1-todays-garden?ui=garden` (and the other 10 names) next to `docs/design/garden/reference/*.png`; try the A6 chips, the A7 tiles and the A8 switch.
3. `npm run garden:diff -- --base http://localhost:3000 --cookie dygo_ui=garden` and look at `.garden-diff/*.diff.png` (red counts, yellow is ignored anti-aliasing).
4. Signed in: `/garden?ui=garden`, water a few words at `/garden/review`, then the tabs. `/?ui=classic` should look exactly as before.

## Pass 3: verification of the canvas fidelity pass (automated, 2026-09-26 05:16 UTC)

Scheduled task "Dygo Phase 12: build all garden screens to match the canvas (pass 2, continue)". Pass 1 had finished at 04:18 (`c058552`, steps 0–7 all committed, no garden work in progress), so this pass only verified it. No code, commits or reference changes. The untracked `docs/design/garden/A6-topics-completion-plan.md` (written 05:15, not by this task) was left alone.

| Check (committed `HEAD` = `c058552`, via `git archive` into a scratch mirror, `npm ci`) | Result |
| --- | --- |
| `tsc --noEmit` (app and `tsconfig.test.json`) | Clean |
| `next lint` | No warnings or errors |
| `vitest run` | 150 passed, 12 files |
| `next build` | Not re-run (pass 1 ran it on the same commit) |

**Pixel diff.** The device shell can't download Chromium (network allowlist), so I ran `next dev` there (dummy env values, fixture pages need no backend), saved the 11 `/garden/_reference/*` pages with their CSS, JS and fonts as a static snapshot, and ran the committed `scripts/garden-diff.mjs` unchanged against that snapshot with Playwright's Chromium 1194 (x86-64) in the cloud workspace. That Chromium renders exactly like the one that made the reference PNGs (A1 scores 0 pixels), so there is no noise floor this time:

| Reference | Diff |
| --- | ---: |
| A1-todays-garden | 0.000% |
| A2-review-question | 0.001% |
| A2-review-answer | 0.180% |
| A2-review-finished | 0.001% |
| A3-mission-complete | 0.001% |
| A4-weekly-harvest | 0.000% |
| A5-welcome-back | 0.000% |
| A6-topics | 0.000% |
| A7-topic-bed | **0.754%** |
| A7-topic-bed-filter-sprouts | 0.278% |
| A8-me | 0.056% |

Every remaining red pixel sits on a Vietnamese text line (A7: the 8 meaning lines; A2-answer: the meaning; A8: "Tiếng Việt"), plus 9 pixels in the status bar. That confirms pass 1's finding: A7 is over 0.5% only because the app draws ạ/ả/ấ/ộ in Be Vietnam Pro where the canvas used the system fallback, as decided. Everything else is pixel-identical.

Left behind (gitignored, safe to delete): `com.dygoacademy.frontend/.garden-diff/pass2-snap.tgz` (the snapshot).

**Next open item:** unchanged — G1 on Dylan's Mac, then the UI-5 backend fields (see also the new A6 completion plan).

## UI-L pass: the garden in English, 简体中文 and Tiếng Việt (automated, 2026-09-26 08:10–12:20 UTC)

Scheduled task "UI-L — the app in three languages", continued by Dylan after the repo folder was connected. Spec: `docs/plans/phase 12 implementation plan.md` → UI-L. UI-G was not started. One interruption: the connection dropped during part 3 and the pass resumed from the same state.

### Commits

| Commit | Part |
| --- | --- |
| `33466be` | UI-L (1): locale plumbing. `src/i18n/config.ts` (en / zh-CN / vi, formatting locale en-SG, en-US for `America/*` zones, vi-VN, zh-CN; Sunday week start only for en-US), resolution profile `ui_locale` → `dygo_locale` cookie → Accept-Language → en (`garden-locale.ts`, one cached lookup per request), `lang` + time zone + formatting locale on the garden root, `?locale=` on the reference pages, `setGardenLocaleCookie` server action |
| `d5bd675` | UI-L (2): every garden string, date and number through next-intl. `components/garden/format.ts` (calendar days in UTC, the learner's today in their zone, weekday names/initials, numbers, clock times, all Intl), screens take Dates / clock times / counts instead of formatted strings, rating intervals and parts of speech translated, the no-raw-strings lint on the garden folders |
| `88fdefe` | UI-L (fix): IELTS band written "7.0" in every language. **Not from this pass** — committed by a Claude Sonnet session while this one was running (see "Things to know") |
| `b2babd6` | UI-L (3): `messages/vi.json` (canvas copy word for word), `messages/zh-CN.json` (glossary draft, `_meta: "draft, needs native review"`), key-parity + ICU-argument/tag test |
| `94119e3` | UI-L (4): per-language fixture data, `garden:diff --locale en,vi`, the two Vietnamese nowrap tweaks, font chain in the canvas renderer's order, README table |
| `dab36e8` | UI-L (5): zh-CN screenshot check; shorter Chinese where it wrapped |
| `0d3f098` | UI-L (6): migration `20260926_profile_locales.sql`, `PATCH /api/v1/profiles/me`, Jest, API surface row |
| `4d6f4eb` | UI-L (7): Language sheet on A8, wired to the profile |
| (this report) | UI-L (8) |

### Pixel diff: 11 references, English and Vietnamese

Committed `scripts/garden-diff.mjs --locale en,vi`, 390 × 844 @2x, pixelmatch 0.1, run against a static snapshot of `next dev` (device shell) in Playwright Chromium 1194 x86-64 (cloud), the browser that renders the reference HTML itself with 0 differing pixels (noise floor 0).

| Reference | English | Vietnamese |
| --- | ---: | ---: |
| A1-todays-garden | 0.000% | 0.000% |
| A2-review-question | 0.001% | 0.001% |
| A2-review-answer | 0.180% | 0.001% |
| A2-review-finished | 0.001% | 0.001% |
| A3-mission-complete | 0.001% | 0.001% |
| A4-weekly-harvest | 0.000% | 0.000% |
| A5-welcome-back | 0.000% | 0.088% |
| A6-topics | 0.000% | 0.000% |
| A7-topic-bed | **0.738%** | 0.001% |
| A7-topic-bed-filter-sprouts | 0.262% | 0.001% |
| A8-me | 0.050% | 0.000% |

- **All 11 Vietnamese references pass.** The one difference left is A5's rain-barrel line: ICU's weekday name is "Chủ Nhật", the canvas wrote "Chủ nhật" (one letter).
- **English A7 is still over 0.5%, for the decided reason:** the English references were drawn with DM Sans only (Vietnamese meaning lines in the system fallback); the app uses Be Vietnam Pro. The `-vi` references were drawn with the app's stack, and match.
- What the iteration found: the first Vietnamese run was 0.05–2.1%, all on Vietnamese letters. The canvas renderer (`tools/render.js`) resolves each font family as one family of subsets, where the subset declared last wins and the plain latin file (no `unicode-range`) builds some letters from base + combining marks. The app now chains its next/font families in that same order (`--font-body`, `--font-display` in globals.css; no `unicode-range` on the two latin files). That took Vietnamese to the table above and English A7 from 0.754% to 0.738%.

### Chinese (zh-CN) screenshot check

All 11 fixture pages at the 8 viewports of design system §16.1 (88 screenshots), compared element by element with English at the same size. Fonts: Noto Sans CJK SC as the system CJK font; Latin in DM Sans / Fraunces.

- **No tofu:** every glyph came from DM Sans, Fraunces or Noto Sans CJK SC. (The IPA stress mark ˈ uses the system Latin font in every language, English included; the canvas does the same.)
- **No clipped text and no sideways page scrolling** at any size.
- **New wraps vs English, found and fixed (`dab36e8`):** A8 "38 小时" broke inside its stat tile (now "38h"); the A5 rain-barrel line and the A4 seed-pack line were too long (shorter Chinese, and the pack name never breaks); the A4 legend at 320px (ASCII parentheses, shorter "照此速度").
- **Left as is:** on A2-answer the English definition can take two lines, because once a meaning language is set it is the second, smaller line (decided order, not a translation problem).
- Screenshots + table: `com.dygoacademy.frontend/.garden-diff/uil-zh-CN/` (gitignored; `README.md` there lists every viewport × screen).

### Backend (`0d3f098`)

- `profiles.timezone` was never written through the API (only read by `resolveUserTimezone`), so the pass added `PATCH /api/v1/profiles/me` in a new `ProfilesModule`: `uiLocale` (en, zh-CN, vi) and `meaningLocale` (zh-CN, vi); omit to keep, `null` to clear, empty body 400, other codes 400, own row via an RLS-scoped `UPDATE` (`profiles_update_self`), 404 if no row. Timezone stays out until the WS1 setting exists.
- Migration `database/migrations/20260926_profile_locales.sql`: two nullable text columns + check constraints; RLS and grants unchanged. Filed under the new `migrations/` convention, it also sorts after `017_…` in the old chain.
- The frontend reads the profile with `select('*')`, so the garden keeps working (cookie / browser language) before the migration is applied.

### Checks

| Check | Result |
| --- | --- |
| `tsc --noEmit` (app + `tsconfig.test.json`) | Clean, on the working tree and on `git archive HEAD` (committed files only) |
| `next lint` | No warnings or errors (includes the new no-raw-strings rule on the garden folders) |
| `vitest run` | 182 passed, 17 files (new: i18n config, formatting, message parity, Language sheet) |
| `next build` | Passes on `git archive HEAD` (Linux mirror, dummy env) |
| Backend `jest` | 233 passed on the working tree; 177 passed on `git archive HEAD` (the difference is the uncommitted Phase 10 work). New: 7 profile tests |
| Backend `tsc --noEmit` | Clean on `git archive HEAD` |
| A8 row as a button | 0 pixels different from the canvas's div row |

### Not verified here

- The language switch signed in, end to end (no Supabase or API in the sandbox): PATCH → cookie → `router.refresh()` re-rendering in the new language, and the setting following the learner to a second device. The sheet itself is unit-tested and the server path is covered by the resolution tests.
- The migration against a real database (`apply-migrations.sh --migrations`), and the RLS suite with the new columns.
- macOS Chrome: expect every screen a little higher than the table (different anti-aliasing; the README's noise-floor rule applies).
- Chinese with PingFang SC (the Mac's CJK font); here Noto Sans CJK SC was used. Wrap checks were done with Noto, which is slightly wider, so PingFang should only have more room.

### Assumptions

1. **Review-card order in English:** the decision says the meaning-language line goes first whenever one is set, but the approved English A2-answer artboard shows the English definition first. The live garden follows the decision; the English reference page passes `meaningFirst: false` to reproduce its artboard. Please confirm, or re-export the English artboard.
2. **Time zone:** the garden formats in `profiles.timezone`; when it is the schema's "never set" value (`UTC`), it uses `Asia/Ho_Chi_Minh`, the backend's `DEFAULT_TIMEZONE`. (The backend prefers the browser's zone in that case; the frontend server can't know it before hydration.)
3. **English clock:** en-SG CLDR writes "7:30 am"; the garden upper-cases the day period and uses a normal-width space, as the canvas does.
4. **IELTS band** is written "7.0" in every language (a score, not a quantity) — the same as `88fdefe`.
5. **Vietnamese strings the canvas doesn't show** (errors, empty states, the gallery and tokens dev pages) are Claude's translations using the glossary; Chinese is all draft.
6. **Greeting in Vietnamese:** the canvas writes "Chào Minh" for the evening; the pass uses "Chào {name}" at every time of day.

### Things to know

- **Another agent was working in the repo at the same time.** `88fdefe` was committed by a Claude Sonnet session during this pass, and around 11:44 UTC `messages/vi.json` briefly held different, non-canvas Vietnamese copy before going back to the committed version. This pass only committed exact paths, and every commit was checked on `git archive HEAD`. If another UI-L task is scheduled, please stop it.
- `docs/architecture/dygo_academy_api_surface.md` has other people's uncommitted edits: only the new row was committed (staged as HEAD + that row); the working copy keeps both.
- `package.json` / lockfile are unchanged. `@formatjs/icu-messageformat-parser` (used by the parity test) comes with next-intl.
- Left behind (gitignored): `.garden-diff/uil-snap.tgz`, `.garden-diff/uil-zh-CN*`.

### Next open item

UI-G (Groups), built in all three languages from the start and diffed against the GR references in English and Vietnamese. Before it: apply `20260926_profile_locales.sql`, and a native review of `zh-CN.json`.

### What to check on your Mac

1. `cd com.dygoacademy.frontend && npm install && npm test` (expect 182 passing), `npx tsc --noEmit`.
2. `./database/apply-migrations.sh --migrations`, then restart the backend.
3. `npm run dev`, then `/garden/_reference/A1-todays-garden?locale=vi&ui=garden` (and `?locale=zh-CN`) next to `docs/design/garden/reference/A1-todays-garden-vi.png`; `npm run garden:diff -- --base http://localhost:3000 --cookie dygo_ui=garden --locale en,vi`.
4. Signed in: `/garden?ui=garden` → Me → "Meanings in" → pick Tiếng Việt, then 简体中文: the garden should switch without a reload and stay switched on another device. `/?ui=classic` must look exactly as before (English).

## UI-G pass: Groups, "shared gardens" (automated, 2026-09-26 12:41–22:10 UTC)

Scheduled task "UI-G — Groups". UI-L was already finished (last commit `a64d74f` at 12:03, no unreported work under the garden or message folders), so the pass went straight to UI-G. Spec: `docs/plans/phase 12 implementation plan.md` → UI-G, decisions 9–11, §10. One interruption: the link to the Mac dropped during part 4 and the pass resumed from the same state when Dylan asked it to continue.

### Commits

| Commit | Part |
| --- | --- |
| `d9ab4d8` | UI-G (1): `GroupCard`, `GardenerRow`, `RoleBadge`, `InviteSheet` (body), `TrickyPatchRow`, `RainDayBanner`, plus `GardenerAvatar`/`AvatarStack`, the `GroupSheet` frame, the Start-a-garden body and the group drawings (`groupArt.tsx`), all from `reference/GR*.html`; shown on `/garden/_gallery` ("Shared gardens (UI-G)"). Every group string in `en.json`, `vi.json` (canvas copy) and `zh-CN.json` (draft). Four garden-only tokens; `format.ts` `shortDay` ("2 Sep" / "2/9") |
| `f064042` | UI-G (2): GR1–GR7 presentational screens, `screens/groupFixtures.ts` (canvas sample data per language), `/garden/_reference/GR…?locale=en\|vi\|zh-CN`, `garden-diff.mjs` lists the GR names; the tab bar takes `groups` and uses the canvas's 4px side padding with five tabs |
| `f061b5a` | UI-G (3): the fifth "Groups" tab only for learners in at least one group (`GroupsTabLive` in the (garden) layout, `GroupsTabProvider`/`useGroupsTab`); A1–A8 reference pages keep four tabs |
| `4a4b2cc` | UI-G (4): migration `20260926_group_garden.sql`, `GroupGardenService` + four routes, Jest, `rls_group_garden_test.sql`, API surface rows |
| `92e86bb` | UI-G (5): live routes, invite / create / join-with-link / invite-links / settings sheets, middleware `/join/<token>` → `/garden/join/<token>` for flagged users, A6 "Group" chip and A4 group card links |
| (this report) | UI-G (6) |

### Pixel diff: GR1–GR7, English and Vietnamese

Same method as the UI-L pass: a static snapshot of `next dev` (device shell, Linux mirror) screenshotted in Playwright Chromium 1194 (cloud), 390 × 844 @2x, pixelmatch 0.1, against `reference/<name>.png` and `<name>-vi.png`. References untouched.

| Reference | English | Vietnamese |
| --- | ---: | ---: |
| GR1-shared-gardens | 0.000% | 0.000% |
| GR2-group-garden | 0.001% | 0.001% |
| GR3-tricky-patches | 0.001% | 0.001% |
| GR4-gardeners | 0.013% | 0.001% |
| GR5-invite | 0.001% | 0.001% |
| GR6-join | 0.001% | 0.001% |
| GR7-create | 0.001% | 0.001% |

- First run: every GR screen with the tab bar was at ~0.255%; the canvas pads a five-tab bar 4px at the sides (8px with four). Fixed in the tab bar; nothing else needed changing.
- GR4 English 0.013% is a few anti-aliased pixels on the back button's circle.
- The 11 A references are unchanged from the UI-L table (A1–A8 re-run after parts 2, 3 and 5: identical, e.g. A4 and A6 0.000% in both languages after the A4/A6 link changes).

### Chinese (zh-CN) screenshot check

All 7 GR fixture pages in `zh-CN` and English at the 8 viewports (320 × 568 … 1024 × 1366), Noto Sans CJK SC as the CJK font. No horizontal scrolling, no clipped text (the only "clipped" element is GR2's screen-reader-only gardener count, which is meant to be 1px), no tofu; the Chinese rain-day title fits on one line where the English wraps. Nothing to change.

### Backend (`4a4b2cc`)

`database/migrations/20260926_group_garden.sql`, four `SECURITY DEFINER` functions (`set search_path = public`, execute for `authenticated` only) that re-check membership themselves and return numbers only:

| Function | For | Who |
| --- | --- | --- |
| `group_garden_counts(group)` | gardeners, shared beds, words | members (no row otherwise) |
| `group_garden_activity(group, since)` | gardeners who watered since `since`, ripe plants | members (42501 otherwise) |
| `group_tricky_patches(group, since, limit)` | misses and distinct gardeners per word | ADMIN |
| `group_invite_preview(token)` | name, description, inviter display name (never email), role, counts, already_member | anyone signed in with a valid token; read-only, same errors as redeem |

Routes (`GroupGardenService`): `GET /groups/garden-counts` (separate from `GET /groups`, so the classic list never depends on the migration), `GET /groups/:id/garden?tz=` (404 non-member; the beds carry the caller's own due and stage counts, read under their own RLS), `GET /groups/:id/tricky-patches` (403 non-admin, last 7 days, top 5), `GET /invites/:token/preview` (404 / 410). FR-1.2 holds: no response carries a user id, email or another learner's word-level data (Jest asserts that for every method).

### RLS results

Run in a throwaway Postgres 16 (cloud) built from the working tree's `tests/00_supabase_stub.sql`, `schema/*`, `migrations/*` and `seeds/01_core_fixtures.sql`:

- **Main suite `tests/rls_test.sql`: 64 checks pass** with both migrations applied.
- **New `tests/rls_group_garden_test.sql`: 30 checks pass.** Highlights: a Viewer (Alex) gets the real gardener count (4) while `group_members` still shows him one row and he still can't read Priya's `user_word_srs`; Dana (other tenant) gets no counts and errors from the activity and tricky functions; tricky patches raise for READ and WRITE; "my due words" counts only the caller's rows; the invite preview returns the inviter's display name, not the email, doesn't seat anyone or use up the invite, and fails on unknown and revoked tokens; `anon` can't call any of it.
- `apply-migrations.sh --test` does not run the new file yet: the script has someone else's uncommitted edits. To run it: after `--test`'s schema + fixtures, `psql -f database/migrations/20260926_group_garden.sql` then `psql -f database/tests/rls_group_garden_test.sql` in the same scratch database (header of the test file).

### Live routes (`92e86bb`)

| Route | Screen | Endpoints |
| --- | --- | --- |
| `/garden/groups` | GR1 + GR7 sheet + "join with a link" sheet | `GET /groups`, `GET /groups/garden-counts`, `GET /groups/:id/members` (initials; a Viewer sees only themself), `POST /groups` |
| `/garden/groups/[id]` | GR2 (+ GR5 for admins) | `GET /groups/:id/garden`, members, `POST /groups/:id/invites` |
| `/garden/groups/[id]/manage[?tab=gardeners]` | GR3 / GR4, admins only | tricky patches, `POST /notifications/groups/:id/sprint`, `PATCH`/`DELETE` members, `GET /groups/:id/invites`, `DELETE /invites/:id`, `PATCH`/`DELETE /groups/:id` |
| `/garden/join/[token]` | GR6 | `GET /invites/:token/preview`, `POST /invites/:token/redeem` |

Everything the classic group pages do is there: create, rename / describe / visibility, delete, roster roles and removal (409 last admin), invite links with a role (mint, list, revoke), join by link, sprint push, the mistake data. The classic pages are unchanged and stay until UI-8.

### Checks

| Check | Result |
| --- | --- |
| Frontend `tsc --noEmit` (app + `tsconfig.test.json`) | Clean on the staged tree of every commit |
| `next lint` (garden folders, hooks, middleware) | No warnings or errors |
| `vitest run` | 205 passed, 21 files (new: group components, group screens, groups tab, live group data) |
| `next build` | Passes on the staged tree of part 5 (Linux mirror, dummy env); the four new routes are dynamic |
| Backend `tsc --noEmit` | Clean on the staged tree |
| Backend `jest` | 188 passed on the staged tree (`git archive` of the index; new: 12 in `group-garden.service.spec.ts`) |
| Backend `eslint src/modules/groups` | Clean |
| RLS | 64 + 30 pass (above) |

### Not verified here

- Every signed-in flow end to end (no Supabase or API in the sandbox): create, invite → copy/share → open `/join/<token>` on another account → preview → join, role changes, sprint push, settings, delete.
- The migration against the real database.
- `navigator.share` / clipboard on iPhone Safari.
- macOS Chrome pixel numbers (expect a little higher, per the README's noise-floor rule), and PingFang SC for Chinese.

### Assumptions

1. **Rain days aren't stored.** `POST …/sprint` sends a push and keeps no row, so there is nothing to show for "Rain day today" (GR1), the GR2 banner, progress counts, or "Last rain day" (GR3). Those blocks are hidden on live data; the reference pages show them. A `group_sprints` table (with done counts) is the next backend item if you want them live. The push text says "water N words today" with the size chosen on GR3.
2. **Tricky patches** use a new aggregate (last 7 days, distinct gardeners) rather than the all-time heatmap, because GR3 shows both. Same ADMIN rule and privacy shape as the heatmap.
3. **Invite links** are the classic `/join/<token>` (works for every user, and matches the canvas's `dygoacademy.com/join/…`); flagged users are redirected to `/garden/join/<token>`. The token is minted on the first Copy / Share (the raw token is returned only once); changing role or limits afterwards makes the next Copy mint a new link. Expiry and uses step through presets (7 / 1 / 30 days / never; 20 / 1 / 100 / no limit).
4. **GR1 tile plant** comes from the garden's size (≥ 100 words tree, ≥ 30 flower, else sprout); **GR2 bed plant** from the stage most of your words are in. The header's gardener total is the sum over gardens (a person in two gardens counts twice).
5. **Initials** show only the gardeners the roster endpoint lets you see (a Viewer sees themself), plus "+N" from the real count on GR2 (decision 10).
6. The GR7 name field shows a forest border when filled (the canvas draws it filled and focused).
7. `zh-CN` group copy is Claude's draft like the rest of `zh-CN.json`; the Vietnamese copy the canvas doesn't show (errors, empty states, the invite-links and settings sheets) is Claude's translation using the glossary.

### Things to know

- **`docs/architecture/dygo_academy_api_surface.md` was briefly emptied by this pass and restored.** A script wrote the file before reading it. The pass restored it from git's object store (the uncommitted version from 25 Sep 14:06, blob `9ee0042`) plus the UI-L `PATCH /profiles/me` row; `git diff --stat` against HEAD is again exactly the 10 insertions / 5 deletions it showed at the start of the pass. Please skim that file's uncommitted diff once to confirm nothing newer than 25 Sep 14:06 was in it. The four new rows were committed as HEAD + rows; the working copy keeps both.
- **git here can create files but not delete them**, so each commit leaves `.git/HEAD.lock` / `.git/index.lock` behind. The pass moved only the locks its own commits left (and the UI-L pass's stale `HEAD.lock` from 12:03, checked stale first) into `.git/stale-locks/`. An older `.git/next-index-19.lock` (12:03) is still there, and git left a few `tmp_obj_*` files under `.git/objects/` that it couldn't unlink; all harmless, safe to delete on the Mac.
- Nothing else in the ~110 uncommitted changes was touched; only exact paths were staged. `package.json` / lockfiles unchanged.
- Left behind (gitignored): `com.dygoacademy.frontend/.garden-diff/uig/` (snapshot and the messages script).

### Next open item

Apply `20260926_group_garden.sql`, then the Mac checks below. After that: rain-day storage (small backend item) if you want the banners live, and the open parts of UI-3 to UI-6 (plan §1). UI-G has no gate of its own; G2 (core loop live for beta users) is the next gate.

### What to check on your Mac

1. `cd com.dygoacademy.frontend && npm install && npm test` (expect 205 passing), `npx tsc --noEmit`; backend `npm test`.
2. `./database/apply-migrations.sh --migrations`, restart the backend.
3. `npm run dev`, then `/garden/groups?ui=garden` in English, then switch Me → Language to Tiếng Việt and 简体中文: create a garden, open it, Tend the garden → Gardeners → Invite → Copy link; open the link in another browser signed in as someone else (with `?ui=garden`) → join → you land in the garden; back as admin, change their role, call a rain day.
4. `npm run garden:diff -- --base http://localhost:3000 --cookie dygo_ui=garden --locale en,vi` (now includes GR1–GR7).
5. `/?ui=classic` and the classic `/groups` pages must look exactly as before.

## Rain days (RD passes)

- **RD-1** (commit `UI-G RD-1: group rain days table, SQL functions and RLS tests`): `database/migrations/20260927_group_rain_days.sql` adds `group_rain_days` (RLS: members select, no write policies), `start_group_rain_day` (ADMIN; 42501 / 22023 bad count / 23505 one already running; `local_date` + `ends_at` = end of the local day in the caller's `profiles.timezone`), `cancel_group_rain_day` (ADMIN; returns `true` if one was cancelled, `false` if none — the plan left the return type open) and `group_rain_day_status` (READ; current + last finished; `gardeners`, `done`, `mine`; no user ids). Test: `database/tests/rls_group_rain_days_test.sql`.
- Checks: ran in a scratch Postgres 16 (stub + schema + both 2026-09-26 migrations + this one + `seeds/01_core_fixtures.sql`): all 33 rain-day assertions pass, and `rls_group_garden_test.sql` still passes. Not run against real Supabase.
- Note for RD-2: `p_words` is `smallint` as specified, so a raw `pg` call must cast (`$2::smallint`); PostgREST/`rpc()` coerces named JSON args. Apply with `./database/apply-migrations.sh --migrations`.
- **RD-2** (`cb1fcc9`): new `RainDayService` (`groups/rain-day.service.ts`) over the RD-1 functions (42501→403, 23505→409 "A rain day is already running today", 22023→400). `POST /notifications/groups/:groupId/sprint` takes optional `wordsPerGardener` (5/10/20, default 10), stores the rain day after the ADMIN + members checks and **before** any push (409 → nothing sent), and returns `rainDay: { id, endsAt, wordsPerGardener }` alongside the old totals (classic trigger unaffected). New `GET /groups/:id/rain-day` → `{ current, last }` and `DELETE /groups/:id/rain-day` → 204 (404 if none running, since `cancel_group_rain_day` returns false). `NotificationsModule` now imports `GroupsModule`. API surface rows added (staged only this hunk; others' edits in that file left uncommitted).
- Checks (scratch mirror, Mac `node_modules` symlinked): backend `tsc --noEmit` clean; jest groups + notifications + analytics 8 suites / 86 tests pass; eslint clean on touched files.
- Unverified: not run against a real database or booted Nest app (DI wiring checked by tsc + unit tests only). Note: the RD-1 SQL falls back to `'UTC'` when the admin's `profiles.timezone` is blank, not the backend `DEFAULT_TIMEZONE` the plan names; left as is (DB is RD-1's scope). A stale `.git/HEAD.lock` after the commit was moved to `.git/stale-locks/`.
- **RD-3** (`39d855b`, 2026-09-27 pass; this pass found no RD-3 commit, so it did RD-3 instead of RD-4): `GroupGardenService.countsForMine` (`GET /groups/garden-counts`, GR1) left-joins `group_rain_day_status(g.id)` where `is_current`, so each row gains `rainDay: { wordsPerGardener, gardeners, done, mine, endsAt } | null` (camelCase as the plan's API table; the older fields stay snake_case). New jest case (running + absent rain day, no personal keys); API surface GR1 row extended (only that hunk staged).
- Checks (scratch mirror): backend `tsc --noEmit` clean; jest groups + notifications 6 suites / 66 tests pass; eslint clean on the two touched files.
- Unverified: not run against a real database (a member always passes the status function's READ check, but one extra SECURITY DEFINER call per group on GR1 is untimed). Commit left a `.git/HEAD.lock` and a few `.git/objects/*/tmp_obj_*` files the shell can't delete; the lock was moved to `.git/stale-locks/`, the tmp objects are harmless. **Next: RD-4.**
- **RD-4** (2026-09-27 pass; no RD-4 commit existed, so this pass did RD-4, not RD-5): frontend on live data. GR1 (`GroupsLive`) shows the rain-day banner for the first garden in list order with `rainDay` in garden-counts (done of gardeners, "ends" = `endsAt` − 1 min in the viewer's zone → "11:59 PM" for the admin); GR2 (`GroupGardenLive`) reads `GET /groups/:id/rain-day` → banner with done/you; GR3 (`TendGardenLive`) "Last rain day" = current else last (weekday, done of gardeners; `TendGardenScreen.last` gained optional `members`), "Start rain day" sends `wordsPerGardener`, and a 409 "already running" shows the new `tend.alreadyRunning` string (4 locales; other errors still "couldn't be sent"). "Water" opens the shared bed with the most of your due words (GR1 fetches that one garden; fallback: first bed / the garden). `useTriggerSprint` invalidates rain-day + garden-counts on success; types in `useGroupGarden.ts` + `SprintResult.rainDay?`. Helpers `wettestBed`, `firstRainDay`, `rainDayEnds` + 3 Vitest cases.
- Checks (scratch mirror, fresh Linux `npm ci`): frontend `tsc` (app + test config) clean, `next lint` clean, Vitest 21 files / 214 tests pass, `next build` passes (placeholder `NEXT_PUBLIC_*` env); backend `tsc` clean, jest 21 suites / 255 tests pass. This commit also carries the RD-2/RD-3 report lines above, which earlier passes left uncommitted.
- Unverified: `garden:diff` GR1–GR7 not run (no browser can reach the VM's dev server); the reference fixtures pass the same props as before, so no pixel change is expected. Signed-in flows not tried. **Next: RD-5.**

## NAV-1

- Commits: `b30b6a0` (design export, canvas 1790485425-11d4) and the `NAV-1` code commit that carries this section. A-screen reference pages render in a group (5 tabs); A6 has no Group chip (`topicFilters`, `TopicsScreen`/`TopicsLive` link and `groupsHref` removed; shared beds stay under All); A4's group card links to `/garden/groups/[id]` using the learner's first group from `GET /groups` + `GET /groups/:id/garden` (watered today, gardeners, shared words = `word_count`). With no group there's no card. Messages: `groupBody` updated and `topics.group`, `topics.openGroups`, `harvest.groupName`, `harvest.openGroups` dropped in en-US, en-SG, vi-VN, zh-CN (the brief's `en`/`vi.json` are now the full locale files).
- Checks (scratch mirror on the VM, Linux `npm ci`): `tsc --noEmit` (app + test config) clean, `next lint` clean, Vitest 21 files / 216 tests pass (+2 A4 group-card cases).
- Unverified: `garden:diff` A1/A4/A5/A6/A8 en/vi not run (no Chromium on the VM, and too little disk for Next's compiler), so there are no diff % figures. Live A4 card shows no initials row (aggregate endpoints have no members); zh-CN `groupBody` "个共享单词" needs the native review. RD-5 never landed (no commit 2½ h after its 04:45 start); no rain-day files touched.

## UI-3 finish

- **U3-0** (this commit, report only; RD-5 redone as specified, since it left no commit). Checks on committed `HEAD` `f00dc6e` (`git archive` into a VM scratch mirror, Mac `node_modules` symlinked, Linux rolldown binding via `NAPI_RS_NATIVE_LIBRARY_PATH`): frontend `tsc --noEmit` (app + test config) clean, `next lint` clean, Vitest 21 files / 216 tests pass, `next build` passes (placeholder `NEXT_PUBLIC_*` env); backend `tsc` clean, jest 20 suites / 199 tests pass (HEAD has 20 spec files; the 21 / 255 in RD-4 counted others' uncommitted SRS specs).
- Pixel diff (static snapshot of `next dev` on the VM, screenshotted in the cloud with full Playwright Chromium 1194, 390 × 844 @2x, pixelmatch 0.1; the headless shell renders text differently, ~1.3–7% on every screen incl. unchanged GR1, so it isn't usable). After NAV-1, en / vi: A1 0.000 / 0.000%, A4 0.000 / 0.000%, A5 0.000 / 0.088%, A6 0.000 / 0.000%, A8 0.050 / 0.000%. RD-5 GR unchanged, en / vi: GR1 0.000 / 0.000, GR2 0.001 / 0.001, GR3 0.001 / 0.001, GR4 0.013 / 0.001, GR5–GR7 0.001 / 0.001%. All ≤ 0.5%, nothing to fix; no code changed.
- Unverified: signed-in / live-data flows (rain-day banners, A4 group card) not tried; migrations not applied to real Supabase; zh-CN not diffed (no reference). Snapshot tarballs left in the gitignored `com.dygoacademy.frontend/.garden-diff/` (`u3-0-snap*.tgz`, deletable). **Next: U3-1.**

## UI-5 finish

- **U5-1** `6e86063`: `GET /topics/:id` words now carry the caller's own `fsrs_state`, `mastered_at`, `is_leech`, `next_due_at` (left join to `user_word_srs` on `topic_word_id` and `user_id = caller`, on top of the owner-only RLS policy; all null when never studied). `TopicWordRow` type extended; API surface row updated. Files: `topics.service.ts`, `topics.service.spec.ts`, `docs/architecture/dygo_academy_api_surface.md`.
- Checks (VM scratch mirror of the backend, fresh `npm ci`): `tsc --noEmit` clean; `jest src/modules/topics` 20/20 pass (2 new: join is on the caller's id and stays a left join; nulls pass through for never-studied words).
- Unverified: the SQL was not run against a real Postgres/Supabase (mocked `queryAs` only); no signed-in call to the endpoint. Waited 3 × 15 min for `UI-3 U3-5` (none; U3 is at U3-0), then went ahead as instructed — U5-1 touches no U3 files. A stale `.git/HEAD.lock` (08:27) moved to `.git/stale-locks/`. **Next: U5-2.**
- **U5-2** `03a6962`: A6 beds now sorted by due words, most due first (`sortBedsByDue` in `live/data.ts`, stable; ties / nothing due / no `due_count` keep API order). Stage-mix bar, due badge and "all watered" were already wired from `GET /topics` (seed/sprout/flower/due counts), so nothing else changed.
- U3-1's `EmptyState` doesn't exist yet (U3-1 not done), so A6 keeps `LiveLoading` and TopicsScreen's own empty line; swap in `EmptyState` when U3-1 lands.
- Checks (scratch mirror on the device, Mac `node_modules` symlinked + Linux rolldown binding outside the repo): `tsc --noEmit` ✅, `next lint` on the 3 files ✅, `vitest run` 21 files / 217 tests ✅.
- Not verified: `garden:diff` A6-topics (no Linux Next/SWC and the device VM disk is full); the fixture page doesn't use `TopicsLive`, so it shouldn't move. Signed-in A6 order not checked in a browser.
- Git couldn't unlink its temp objects / `HEAD.lock` on the mount (delete not permitted); lock moved to `.git/stale-locks/`, a few `tmp_obj_*` files remain under `.git/objects/` (harmless). **Next: U5-3.**
- **U5-3** `57b441c`: A7 live now uses the U5-1 per-word SRS state (`toBedWords` in `live/data.ts`): stages via `stageFromSrs` (never studied → seed), real counts on the four tiles so they filter the list, leeches drawn as wilting rows but counted in their underlying stage (tiles add up to the word count), sort by next watering (wilting due → due, longest overdue first → new → soonest), labels "Due now" / "New" / existing ICU `inDays` (min 1 day, so never "in 0 days"). Tiles fall back to "—" if the API lacks the fields. `TopicBedScreen`, fixtures and messages untouched (no new strings). Files: `TopicBedLive.tsx`, `data.ts`, new `bed.test.ts`.
- Checks (device scratch mirror, Mac `node_modules` symlinked, Linux rolldown/lightningcss bindings outside the repo via `NODE_PATH`): `tsc --noEmit` (app + test config) ✅, `next lint` on the 3 files ✅, `vitest run` 22 files / 224 tests ✅ (7 new).
- Not verified: `garden:diff` A7-topic-bed / A7-topic-bed-filter-sprouts (no dev server/browser path; device VM disk ~150 MB free) — the fixture pages don't use `TopicBedLive` and the screen is unchanged, so they shouldn't move. Signed-in A7 not checked in a browser; the API has no lapse count, so live rows show no "tricky, N lapses" suffix. Same `tmp_obj_*` / `HEAD.lock` unlink warnings; lock moved to `.git/stale-locks/`. **Next: U5-4.**
- **U5-4** `321cb6c`: A7 actions. "Water N due" already opened `/garden/review?topic=<id>` (POST /srs/sessions with the topic), so it was kept as is. **Add word** is now a garden `BottomSheet` (`AddWordSheet.tsx`) on `useAddWordForm.ts`, a garden-owned copy of `AddWordModal`'s form logic (trim, POST /words via `useCreateWord`, API message on error, close on success, bed refetches); the classic `AddWordModal.tsx` is untouched. `TopicBedScreen` gained an optional `onAddWord`; without it + still goes to `addWordHref`, so the reference fixture pages are unchanged. Options (and Quiz until U5-5/6) still go to the classic pages. New strings `screens.bed.addSheet.*` in en-SG, en-US, vi-VN, zh-CN.
- Checks (device scratch mirror, Mac `node_modules` symlinked, linux-**arm64** rolldown/lightningcss bindings outside the repo, `NAPI_RS_NATIVE_LIBRARY_PATH`): `tsc --noEmit` (app + test config) ✅, `next lint --dir src/components/garden` ✅, `vitest run` 23 files / 228 tests ✅ (4 new, `AddWordSheet.test.tsx`).
- Not verified: `garden:diff` A7 fixtures (no dev server/browser in the VM; device disk ~70 MB free, so no `npm ci`). The fixture page passes no `onAddWord`, so it should render the same. Not checked: the sheet in a browser signed in, and the vi/zh sheet copy by a native speaker. Prettier isn't installed, so formatting was matched by hand.
- Git housekeeping: the same unlink warnings; `HEAD.lock` and 1,603 leftover `.git/objects/*/tmp_obj_*` files (from this and earlier passes) moved to `.git/stale-locks/` (nothing deleted). **Next: U5-5.**
- **UAT diff switch** `df93e6c` (asked by Dylan): `GARDEN_REFERENCE_PAGES=on` at build time serves `/garden/_reference/*` in a production build (`lib/garden-reference.ts`, used by middleware, layout, page; inlined via `next.config.mjs`). Turned on in `env-profiles/prod.env` (gitignored) and deployed 12:54 UTC; checked A7-topic-bed loads on www.dygoacademy.com. tsc ✅, lint ✅, vitest 230/230 ✅. **While on, the fixture pages are public (noindex)**: remove the line from prod.env and redeploy to hide them.
- **A7 English reference redrawn** `a8b2dc1` (asked by Dylan): garden:diff against UAT (after `df93e6c`) gave A6 0.317%, A7 **0.787% FAIL**, A7-sprouts 0.356%, and vi 0.303 / 0.316 / 0.190% — the A7 failure was the known Vietnamese-glyph font exception. `tools/render.js` now draws `A7-topic-bed` with the app stack (`APP_FONT_STACK`, DM Sans + Be Vietnam Pro); canvas source unchanged. Rendered in Playwright Chromium 1194 (unchanged renderer reproduces the old PNG within 0.213%). New reference vs the UAT screenshot: **0.327%** (pixel-checked in the sandbox; Dylan to re-run garden:diff to confirm).
- **Closed out** (asked by Dylan): garden:diff against UAT all pass after `a8b2dc1` (A6 0.317%, A7 0.327%, A7-sprouts 0.356%, vi 0.303 / 0.316%). `GARDEN_REFERENCE_PAGES=off` in prod.env; `8eb68c4` hides the dev test-account hint on the login page in production. Deployed 13:08 UTC; checked live: reference page 404s again, sign-in card shows no test accounts. Still open: U5-4 behaviour on UAT (manual plan); **Next: U5-5.**
- **U5-4 UAT click-through** (Claude browser, Dylan signed in, vi-VN, bed "AWL Sublist 1"): Add word sheet ✅ (opens with title/bed name, focus, disabled when empty/spaces, trims, POST /words then refetch, word shown as New, Seeds 1→2, enrichment "ready"; duplicate → server error shown, sheet stays; Escape / X / outside tap / grabber drag all close and reset; tablet = centred 540px sheet, no grabber). Classic topic page + AddWordModal unchanged ✅. **Bug: "Water N due" never appears** — `TopicBedLive` calls POST /srs/sessions with `limit: 200`, backend max is 100 → HTTP 400 on UAT, so every bed shows "Nothing due" even when /garden/review?topic=… has cards (it offered "analyse"). From `c42b5b3`, not U5-4; fix = limit 100. Also: duplicate-word error is the API's English text in the vi UI. Not tested: en/zh live (would change the account language). Test data left: "resilient" in AWL Sublist 1.
- **U5-5** `d94f349`: garden quiz question screen at `/garden/quiz?topic=<id>` (`app/(garden)/garden/quiz/{page,QuizLive,feedback}`, `screens/QuizScreen.tsx`) on the classic endpoints (POST /quizzes/generate ×10 for the topic, /:id/answer, /:id/hint). All four types: CLOZE/DICTATION type-in with on-demand hint (+ audio for dictation), MATCHING/CONTEXTUAL_CHOICE options kept on screen as a read-only review. Kind feedback: right = green wash + check; wrong pick = gold "Your pick", no red/✕, explanation + "comes back in your next watering". **No canvas artboard for the adult quiz**: built from garden components + the A2 card style (§11). End state is a plain score + "Back to bed" (result screen = U5-6); A7's Quiz button still opens the classic page until U5-6. New `screens.quiz.*` + `garden.pages.quiz` in all 4 locales (vi/zh mine, need native review). Classic quiz untouched.
- Checks (device scratch mirror, linux-arm64 rolldown/lightningcss bindings outside the repo): `tsc --noEmit` app + test ✅, `next lint` garden + quiz dirs ✅, `vitest run` 25 files / 238 tests ✅ (8 new, `quiz.test.tsx`).
- Screenshots for Dylan: 7 states × en/vi at 390×844 in `com.dygoacademy.frontend/.garden-diff/u5-5-quiz/*.png` (gitignored). They're the component rendered to static HTML with the compiled Tailwind CSS in Playwright Chromium, not the running app; fonts approximated (latin-ext mapped to the latin DM Sans file), most likely why the dictation tag shows "viêt" without its acute (the message string is correct, ế); worth a glance on a real device.
- Not verified: the route signed in against the real API (generate/answer/hint), audio playback, `next build`, zh-CN layout. Git housekeeping: `HEAD.lock` + 58 `tmp_obj_*` moved to `.git/stale-locks/u5-5/`. **Next: U5-6.**
- **U5-5 deployed + UAT click-through** (watch-deploy 13:40 UTC, all 4 steps ✓, `/garden/quiz` in the build). Claude browser, Dylan signed in, vi-VN, 390×844, bed "Food and Beverage", full 10-question quiz: generate / hint / answer calls all 200 (api.dygoacademy.com), audio clip loads and plays (status back to idle, no error); all 4 types seen (CLOZE, DICTATION, MATCHING, CONTEXTUAL_CHOICE); right = green + ✓ with word · IPA + example; wrong = gold "Bạn chọn", correct option marked, Gemini explanation; input autofocuses, Enter checks, focus moves to "Tiếp" so Enter advances; last is "Xem kết quả" → "Đúng 8/10 câu" + "Về luống" → the bed. No console errors. Classic `/quiz?topicId=` still loads in English, unchanged. The "viêt" in the screenshots was only downscaling: at 56px the live font draws "Về luống viết" correctly.
- Found: (1) the Gemini explanation shows raw markdown (`**spinach**`); render/strip it in the garden (classic likely the same). (2) The explanation is English in the vi UI (backend prompt, not U5-5). (3) Data: "lady fringer" in Food and Beverage (probably meant lady finger/okra) was enriched as an obsolete insult, so the quiz asks about it with that meaning. Test data: 2 of Dylan's answers were wrong on purpose/by typo (spinach typed twice = graded miss, so spinach comes back in the next watering; the second miss was the same day, ungraded).
- **Quiz explanation fix** `d996432` (asked by Dylan after the UAT run): POST /quizzes/:id/answer takes optional `locale`; Gemini is asked for Vietnamese / Simplified Chinese (English words kept in quotes) and plain text, and the result goes through `stripMarkdown` either way (classic keeps English, loses the asterisks). The garden quiz sends `useLocale()`; the classic page is unchanged. Checks: backend tsc ✅, eslint ✅, jest quiz + ai 44/44 ✅ (new `nuance-text.spec.ts`, +1 service case); frontend tsc app + test ✅, lint ✅, vitest 238/238 ✅. Deployed 13:53 UTC (all steps ✓). **Not verified live:** the explanation in Vietnamese on UAT (the account's garden now shows en-US, and I stopped browser testing). "lady fringer" data left for Dylan to decide.
- **U5-6** `5f016d7`: garden quiz result screen (`QuizResultScreen`: score, Right / Need water tiles, missed words on the gold wash with "comes back in your next watering", Back to bed / topics); A7 **Quiz** now opens `/garden/quiz?topic=…`; A7 wilting rows link to the leech drill `/garden/quiz?topic=…&mode=leech` (GET /quizzes/leech-drill; it's all of the learner's leeches, not just this bed, and Back returns to the bed). `GARDEN_ROUTES.quiz`, `TopicBedScreen.wiltingHref` (optional, fixtures unchanged), `screens.quiz.result.*` + `emptyDrill`/`drillTitle` in all 4 locales (zh uses 花圃 like the existing quiz keys). No canvas artboard for the quiz: built on the A3 layout.
- Checks (device scratch mirror `~/u56`, Mac `node_modules` symlinked per package, linux-arm64 rolldown/lightningcss bindings outside the repo): `tsc --noEmit` app + test ✅, `next lint` garden + quiz + constants ✅, `vitest run` 26 files / 244 tests ✅ (7 new, `quizResult.test.tsx`).
- Not verified: signed-in run against the real API (result after a full quiz, leech drill with real leeches, empty-drill state), `garden:diff` A7 (only change there: wilting rows become links with the same classes plus hover; the fixture passes no `wiltingHref`, so it renders as before), `next build`, screenshots. Prettier isn't installed in the project, so formatting was only checked by lint. The VM's `/sessions` disk was nearly full (~20 MB free), which is why no `npm ci`. Git housekeeping: leftover `tmp_obj_*` moved to `.git/stale-locks/u5-6/`. **Next: U5-7** (verify + wrap up).
- **U5-6 deployed + UAT** (asked by Dylan; watch-deploy 14:12 UTC, all 4 steps ✓). Built-in browser, Dylan signed in, en, 375×812, bed "Food and Beverage": A7 Quiz → `/garden/quiz?topic=…`; full 10 questions (all 4 types); long beans missed twice on purpose → result "8 of 10 right", Right 8 / Need water 1, "long beans" listed once, Back to bed → the bed. Leech drill `…&mode=leech`: GET /quizzes/leech-drill 200 with no leeches → "No tricky words to drill right now" + Back to bed. No wilting rows in Dylan's beds, so the row → drill tap itself wasn't clicked live (covered by Vitest). Test side effect: long beans got a graded miss (flower → sprout).
- **Found + fixed `b467190`:** A7 asked POST /srs/sessions for `limit: 200`, but the API caps it at 100 → 400 on every bed since `c42b5b3`, so "Water N due" never showed (spinach was "Due now" next to "Nothing due"). Now 100. Redeployed 14:18 UTC ✓: sessions 201, "Water 2 due" shows, meanings from due cards appear. Not re-run: tsc/lint/vitest for this one-line change (no disk on the VM for a mirror).
- **U5-7** (verify + wrap up, 2026-09-27 ~14:30 UTC). Waited for `b467190` to be 15 min old (no uncommitted work in the U5-6 files), then checked everything in a scratch mirror at `/var/tmp/dygo-u57` on the VM (the `/sessions` disk was full): source rsynced, Mac `node_modules` copied, linux-arm64 rolldown + lightningcss bindings added to the mirror only. No code changed.
  - Frontend: `tsc --noEmit` app + test ✅; `next lint` (whole app) ✅ no warnings; `vitest run` 26 files / 244 tests ✅ (includes `b467190`, which wasn't re-checked before); **`next build` ✅** with real Google fonts (placeholder `NEXT_PUBLIC_*` values only), all 14 garden routes incl. `/garden/quiz` build.
  - Backend: `tsc --noEmit` ✅; `jest` 22 suites / 263 tests ✅.
  - **Not verified:** `garden:diff --locale en,vi` for A6/A7. Playwright (unsigned): no Playwright suite exists in the repo (`automationtesting/ui/` is empty), and the VM has no Chromium and the Playwright/Debian download hosts return 403, so no browser could run. Last real diff was Dylan's run against UAT after `a8b2dc1` (A6 0.317%, A7 0.327%, A7-sprouts 0.356%, vi 0.303 / 0.316%, all pass). Since then U5-5/U5-6 only added optional props (`onAddWord`, `wiltingHref`) that the fixture pages don't pass, so they should render the same — please confirm with the diff.
  - Also not verified: zh-CN / vi quiz copy by a native speaker; the wilting row → leech drill tap with a real leech (no leeches in Dylan's beds; covered by Vitest); the quiz explanation in Vietnamese live (`d996432`).
  - Noticed, not touched: the Mac `com.dygoacademy.frontend/node_modules` already contains Linux packages (`@next/swc-linux-arm64-gnu`, `sharp-linux-arm64`), probably optional deps from npm; harmless and gitignored.
  - Plan: UI-5 checklist ticked, §1 UI-5 row ✅; master schedule changelog 5.56 (both uncommitted, as asked).

### UI-5 done — what to try on your Mac

UI-5 is finished: A6 Topics sorts beds by due words; A7 Topic bed shows live stage tiles that filter the list, words by next watering, "Water N due", the garden Add word sheet, Quiz (garden question + result screens) and wilting rows → leech drill. Classic topics / quiz pages are unchanged.

1. `cd com.dygoacademy.frontend && npm run dev`, then `npm run garden:diff -- --locale en-US,vi-VN --only A6-topics,A7-topic-bed,A7-topic-bed-filter-sprouts` (all should be ≤ 0.5%).
2. Signed in with `?ui=garden`: open a bed with due words → "Water N due" appears and starts a review of that bed only.
3. Add word from the bed sheet; check it lands as New and the Seeds tile goes up.
4. Quiz from the bed in English and Vietnamese: finish 10 questions, check the result screen and that the explanation is in Vietnamese in the vi UI.
5. If any bed has a wilting (leech) row, tap it → leech drill; otherwise the empty "No tricky words" state.
6. There's no Playwright suite in the repo yet (`com.dygoacademy.automationtesting` is Jest with an empty `ui/`), so the unsigned browser check is step 1's garden:diff.

Next: UI-6 (missions, including the collocation quiz as mission 3), or the open UI-3 items (`/garden` in `PROTECTED_PATH_PREFIXES`, `EmptyState`, iPad rail).

## UI-3 finish

- **U3-1** `04cd6e9` (2026-09-27 ~18:30 UTC; this pass was scheduled as U3-2, but there was no U3-1 commit and no uncommitted work in its files, so it did U3-1 and stopped). `(garden)/garden/loading.tsx` (skeleton in the screen column, aria-busy, no shimmer with reduced motion), `error.tsx` (friendly message, "Try again" = `reset()`, "Back to my garden"), `not-found.tsx` (for `notFound()` inside garden screens; the layout's flag check still falls through to the classic 404). Shared `EmptyState` (quiet line / titled card) now used by Topics, Topic bed and Groups with the same markup as before; a bed with no words says "This bed is empty…" instead of the stage-filter line. 5 new keys in en-SG / en-US / vi-VN / zh-CN (vi and zh are my translations, worth a look).
- Checks (VM scratch mirror `/var/tmp/dygo-u31/fe` — `/sessions` disk full — Mac `node_modules` copied, linux-arm64 rolldown + lightningcss bindings added to the mirror only): `tsc --noEmit` app + test ✅, `next lint` garden dirs ✅, `vitest run` 28 files / 260 tests ✅ (new: `EmptyState.test.tsx`, `routeStates.test.tsx` in en / vi / zh).
- Unverified: `garden:diff` not re-run (no server/browser this pass; the empty states aren't on any reference page and the replaced markup is identical, so no change expected); loading/error/not-found not seen in a real browser; `next build` not run. Mirror in `/var/tmp/dygo-u31` can be deleted. **Next: U3-2** (iPad rail + sidebar, flag off).
- **U3-2** `51df121` (2026-09-27 ~19:25 UTC; scheduled as U3-3, but there was no U3-2 commit and no uncommitted work in its files, so it did U3-2 and stopped). New `GardenRail` (80px, 600–1023px, icon over label) and `GardenSidebar` (240px, ≥ 1024px, icon beside label, `children` slot for the topic-bed list in UI-7), same 4/5 tabs and active state as the tab bar. `GardenTabBar` renders them and hides the tab bar from 600px only when `isGardenIpadNavOn()` (`constants/garden.ts`, `NEXT_PUBLIC_GARDEN_IPAD_NAV === 'true'`, default off; read from `process.env` there rather than `config/env.ts`). Off, the output is byte-for-byte the old tab bar. `globals.css`: `[data-ui='garden']:has([data-garden-nav])` pads 80/240px. Gallery section "iPad navigation"; 3 keys in en-SG / en-US / vi-VN / zh-CN (vi/zh my translations).
- Checks (scratch mirror `/tmp/dygo-u3-2-mirror`, fresh `npm ci`, deleted after): `tsc --noEmit` ✅, eslint on changed files ✅, `vitest run` garden dirs 26 files / 240 tests ✅ (new `ipadNav.test.tsx`: flag parsing, off = one nav, on = three navs with the same hrefs and `aria-current`).
- Unverified: rail/sidebar not seen in a browser at 600/1024px; `garden:diff` not re-run (flag off, so no change expected); with the flag on, reference pages would also get the rail (UI-7 concern). git left undeletable `tmp_obj_*` files in `.git/objects/` (harmless) and a `HEAD.lock`, moved to `.git/stale-locks/`. **Next: U3-3** (Playwright suite at the 8 viewports).
- **U3-3** `1561fb0` (2026-09-27 ~20:45 UTC; scheduled as U3-4, but there was no U3-3 commit and `automationtesting/ui/` was empty, so it did U3-3 and stopped). New `com.dygoacademy.automationtesting/ui/`: own `package.json` (`@playwright/test` ^1.63, matches the frontend's `playwright-core`) + lockfile, `playwright.config.ts` with one project per §16.1 viewport (`viewports.ts`, DSF 2, reduced motion, installed Chrome or `CHROME_PATH`), `BASE_URL` (default localhost:3000). `tests/fixtures.ts` adds `dygo_ui=garden` (+ `dygo_locale` for the gallery) and the same freeze CSS as `garden:diff`; `reference.spec.ts` screenshots every `/garden/_reference/<name>` found in `docs/design/garden/reference` (18 screens, en-US + vi-VN = 36 per viewport); `gallery.spec.ts` screenshots `/garden/_gallery` en-US + vi-VN but **skips** while signed out (the (garden) layout redirects to login; U3-4 adds the user). 0.5% pixel bar. Baselines `tests/__screenshots__/` gitignored (made on the Mac with `npm run test:update`). `README.md` with the commands.
- Checks (device VM `/sessions` disk full, so a cloud scratch mirror of `ui/` only): `npm install` + `tsc --noEmit` ✅; `playwright test --list` ✅; smoke run with bundled Chromium against a stub server: cookie fixture, reference screenshots and the gallery skip all behave ✅.
- Unverified: not run against the real app (no dev server here); no baselines exist yet. Note: `automationtesting/.env.e2e` (empty) is tracked at the package root — not touched; U3-4 should keep secrets in `ui/.env.e2e` (already gitignored in `ui/`). **Next: U3-4** (signed-in fixture user + tab/back tests). git `tmp_obj_*` leftovers again; `HEAD.lock` moved to `.git/stale-locks/`.
- **U3-4** (2026-09-27 ~22:00 UTC; scheduled as U3-5, but there was no U3-4 commit and no uncommitted work in `automationtesting/ui/`, so it did U3-4 and stopped). Signed-in fixture user in `com.dygoacademy.automationtesting/ui/`: `auth.ts` reads `E2E_EMAIL` / `E2E_PASSWORD` from the environment or `ui/.env.e2e` (gitignored, no dotenv dependency); `global-setup.ts` signs in once through `/login` (labels Email / Password, "Sign in"), waits for `/garden`, saves `.auth/user.json` (gitignored), and removes a stale session when the credentials are unset. `tests/fixtures.ts` gives every test that `storageState`. New `tests/navigation.spec.ts` (en-US, all 8 viewports): every tab of the "Main" tab bar opens, gets `aria-current="page"`, and the tab bar's box stays within 1px of the Garden tab's (no layout jump); Back from a Topic bed → `/garden/topics`, Back from a Group garden → `/garden/groups` (each skips if the user has no topic / shared garden). `gallery.spec.ts` now runs signed in and skips only without credentials. README: `.env.e2e` section.
- Checks (device VM disk still full, so a cloud scratch mirror of `ui/` only): `npm ci` + `tsc --noEmit` ✅; `playwright test --list` 48 tests ✅; smoke run with bundled Chromium against a stub app (login form, 5-tab sticky nav, topic bed / group garden with Back links) at iphone-16 + ipad-landscape: signed out 10 skipped ✅, signed in 6 passed ✅ (`.auth/user.json` written).
- Unverified: not run against the real app or a real Supabase user (no dev server, no credentials here); the jump check was only seen passing, not failing. **Next: U3-5** (verify + wrap up UI-3).
- **U3-5a** `3e602f8` (2026-09-30 ~12:00 UTC), `UI-3 U3-5a: protect /garden in the middleware, keep dev pages public`. `constants/routes.ts`: `'/garden'` added to `PROTECTED_PATH_PREFIXES`, so a signed-out `/garden/...` visit is now bounced by `lib/supabase/middleware.ts` to `/login?next=<path>` (the `(garden)` layout's own redirect, which drops `next`, stays as defense in depth). `/garden/join/<token>` is covered by the same prefix. New `PUBLIC_GARDEN_DEV_PREFIXES` (`GARDEN_REFERENCE_PREFIX`, `GARDEN_ROUTES.gallery`, `GARDEN_ROUTES.tokens`, imported from `constants/garden.ts` — no import cycle, `garden.ts` imports nothing) is checked first in `isProtectedPath`, so those stay public; the flag / `GARDEN_REFERENCE_PAGES` gates in `middleware.ts` are unchanged. New `src/constants/routes.test.ts` (14 tests: /garden, /garden/topics/x, /garden/join/t protected; `_reference/A1-todays-garden`, `_gallery`, `_tokens` public; `/gardening` and `/garden/_galleryx` not falsely matched; old entries unchanged). No middleware test exists, so no redirect-keeps-`next` test was added.
- Checks (Mac `node_modules` via a scratch mirror in `/tmp/u3-5a-mirror`, Linux arm64 rolldown binding via `NAPI_RS_NATIVE_LIBRARY_PATH`, outside the repo): `tsc --noEmit` app ✓; `tsc -p tsconfig.test.json --noEmit` ✗ with **one pre-existing error** not from this pass (`src/i18n/config.test.ts:61` passes 2 args to `localeFromAcceptLanguage`, from `806dd12`); `next lint` on the two files ✓; `vitest run` 34 files / 299 tests ✓.
- Things to know: `_gallery` and `_tokens` live under `(garden)/`, whose layout still redirects signed-out visitors to `/login`, so they're public in the middleware only — signed out they still end at `/login` (as before this change). `_reference` is in `(garden-reference)` and really is public. Unverified: no signed-out redirect seen in a real browser/dev server, no `garden:diff` or Playwright run, no `next build`. `HEAD.lock` / `index.lock` moved to `.git/stale-locks/`; undeletable `tmp_obj_*` leftovers in `.git/objects/`.

- **U3-5** (2026-09-30 ~13:05 UTC, automated pass, report + plan only, nothing committed). U3-5a `3e602f8` present (and `03a1ede`, the e2e sign-in exact-label fix, after it). No code changed.
- Dylan's Mac results (`docs/reports/ui3_mac_checks.md`, 2026-09-30 ~20:50–21:01 SGT): `tsc --noEmit` ✅, `next lint` ✅, Vitest 34 files / 299 ✅ (incl. `routes.test.ts` 14); plain `npm run build` fails at "Collecting page data" only because the frontend has no `.env.local` (missing `NEXT_PUBLIC_*`), and the real `npm run build:prod:domain` ✅ (26/26 pages, all `/garden` routes, middleware 106 kB). **Playwright 448 passed / 0 failed / 0 skipped** (8 viewports × 56, signed in via `.env.e2e`; tab-bar no-jump, Back from Topic bed and Group garden ran on all 8; gallery and every `/garden/_reference` page in en-US + vi-VN).
- Checks on the device VM (in the repo with the Mac `node_modules`; Linux arm64 rolldown + lightningcss bindings in a scratch folder outside the repo via `NODE_PATH`, deleted after; only ~270 MB free, so no full mirror): `tsc --noEmit` app ✅; `next lint` ✅ no warnings; `vitest run` 34 files / 299 ✅. `tsc -p tsconfig.test.json` ✗ with the **same one pre-existing error** as U3-5a/SO-1: `src/i18n/config.test.ts:61` passes a second (time-zone) argument to `localeFromAcceptLanguage`, whose signature lost it in `806dd12` (the test line is from `452a893`). Not UI-3; not fixed here (one-line test fix: drop `'America/Chicago'`).
- Not run here: `next build` (disk) and Playwright (no browser on the VM) — covered by Dylan's Mac runs above.
- Plan updated (on top of its other uncommitted edits): UI-3 checklist all six items ticked (`/garden` protection, tab bar + routes, back buttons + full-screen review, loading/error/empty, rail/sidebar behind the flag, Playwright suite); §4.1 open item closed; "Done when" left open; U3-5 row 🟡; U3-5a row added; §1 UI-3 row 🟡; status line updated. Master schedule changelog 5.58.
- **Closed 2026-09-30 ~21:26 SGT:** Dylan's real-iPhone Safari check passed (all tabs + Back, no layout jumps, full-screen Review, signed-out `/garden/topics` → sign in → back to `/garden/topics`; the live redirect to `/login?next=%2Fgarden%2Ftopics` was also confirmed by a cookie-less request). "Done when" ticked, U3-5 ✅, §1 UI-3 ✅. **UI-3 done.**
- *(Earlier note)* Waiting on Dylan: the real-iPhone check (all tabs + back without layout jumps; signed-out `/garden/topics` → sign in → lands back on `/garden/topics`). When it passes: tick "Done when", U3-5 → ✅, §1 UI-3 → ✅ done (U3-0 `08b4f33` … U3-5a `3e602f8`). **Next per the plan: UI-4** — plant-stage counts (`new`, `learning`, `review`, `mastered`) in `GET /srs/stats` and the test that `preview[r]` equals `rate(r)`.

## UI-A

- **A-1** (2026-09-29 ~13:05 UTC), commit `UI-A A-1: AU sign-in design files, render jobs, README`. Committed the AU design files on their own: 24 references (`docs/design/garden/reference/AU1…AU4*`, `.html` + `.png`, en + vi) and the 8 sources `source/Adult{Login,Register,RegisterInvite,Forgot}{,Vi}.dc.html`. `tools/render.js`: 12 AU jobs (6 en, 6 vi; states `error: true` for AU1-sign-in-error, `sent: true` for AU4-reset-password-sent). README: AU rows in the Screens table, "Adult · Sign in" export line, count now 24 + 24.
- Checks: `node --check tools/render.js` ✅ (scratch copy outside the repo); every AU job's source file and reference `.png`/`.html` exist ✅; only the listed AU files, `render.js` and `README.md` staged.
- Unverified: did not re-run `render.js` (needs the Mac's Chrome + `node_modules`), so the committed PNGs weren't regenerated/compared against the new jobs; no canvas version id recorded for the "Adult · Sign in" page. No other uncommitted design files were in `docs/design/garden/`. **Next: A-2** (garden auth shell + AU1 Sign in).
- **A-2** `a1b8332` (2026-09-29 ~13:50 UTC), `UI-A A-2: AU1 Sign in in the garden style`. New `components/garden/auth/`: `AuthShell` (language chip, forest hero with sprout/flower/tree tiles, title + subtitle, error banner, submit/link classes), `AuthField` (uppercase label, 48px box, Show/Hide, `autocomplete`), `LanguageChip` (native `<select>` over the chip → `dygo_locale` cookie + refresh), `SignInScreen` (props only), `SignInLive` (same `signInWithPassword` + `?next=`/home as classic; `next` now limited to same-site paths; 4xx → "email and password don't match", else a connection message), `authPaths.ts`. `/login` page is now a server page: classic form moved verbatim to `login/ClassicLogin.tsx` and shown whenever the garden flag/cookie is off; `(auth)/layout.tsx` skips `PublicNavbar` only with the garden on. Fixtures `AU1-sign-in` / `AU1-sign-in-error` (reference route + `garden:diff` names), `screens.auth.*` in en-US/vi-VN/zh-CN (zh is a draft).
- Checks (scratch mirror outside the repo, Mac `node_modules` symlinked + a Linux rolldown binding outside the repo): `tsc --noEmit` ✅; `next lint` on the touched dirs ✅; `vitest run` 266/267 ✅ — the 1 failure is an outdated `LanguageSheet.test.tsx` case (fixed in `806dd12`). New `SignInScreen.test.tsx` 6 tests ✅.
- Unverified: **no `garden:diff`** (device VM has no browser and ~60 MB free disk), so AU1 en/vi pixel diffs are unknown — the password dots (browser mask vs canvas `•` text) are the likeliest mismatch; no real sign-in against Supabase, no `next build`. With the garden on, `/register` shows the classic form without the navbar until A-3; the "Forgot password?" link 404s until A-4. git `tmp_obj_*` leftovers; `HEAD.lock` moved to `.git/stale-locks/`. **Next: A-3** (AU2 + AU3 Create account); first run `garden:diff --locale en,vi --only AU1-sign-in,AU1-sign-in-error` on the Mac.
- **A-3** `38665d9` (2026-09-29 ~14:05 UTC), `UI-A A-3: AU2 + AU3 Create account (and from an invite)`. New `RegisterScreen` (AU2: seed/sprout/seed hero; AU3: "Minh invited you to …" banner, "Create account and join", "Sign in to join") and `RegisterLive` (same Supabase `signUp` as classic; "Your name" → `profiles.display_name` via `profiles_update_self` + auth metadata, chip language → `profiles.ui_locale` via `PATCH /profiles/me`, both best effort; same-site `?next=` followed after sign-up; an invite `next` `/join/<token>` or `/garden/join/<token>` switches to AU3). `AuthShell` gained Back / hero / 28px title options (AU1 output unchanged), `AuthField` placeholders, sign-in ↔ create-account links now keep `?next=`. `/register` is a server page; classic form moved verbatim to `register/ClassicRegister.tsx`. Fixtures `AU2-create-account` / `AU3-create-account-invite`, `garden:diff` names, `screens.auth.register.*` + `back` in en/vi/zh (zh draft).
- Checks (same scratch mirror, `NAPI_RS_NATIVE_LIBRARY_PATH` for the Linux rolldown binding): `tsc --noEmit` (app + test config) ✅; `next lint` on touched dirs ✅; `vitest run` 273/274 ✅ — same outdated `LanguageSheet.test.tsx` case (fixed in `806dd12`); new `RegisterScreen.test.tsx` 7 tests ✅.
- **Needs Dylan — AU3 banner data:** the GR6 preview (`GET /invites/:token/preview`, `group_invite_preview()`) is authenticated-only by design (grant to `authenticated`, RLS test asserts anon is refused), and `/register` is signed out, so live AU3 shows the join wording **without** the banner. Options: an anon-safe preview (group name + inviter first name only; backend/DB change, belongs in a UI-G/backend step) or keep it as is. Not guessed here.
- Unverified: **no `garden:diff`** for AU2/AU3 (no browser, ~40 MB disk on the device VM); placeholder colour uses the existing `garden-placeholder` token (#8A938C vs canvas #8A948E). No real sign-up against Supabase, no `next build`. git `tmp_obj_*` leftovers; `HEAD.lock` moved to `.git/stale-locks/`. **Next: A-4** (AU4 Forgot / reset password).
- **A-4** `7a5e342` (2026-09-29 ~17:15 UTC), `UI-A A-4: AU4 Forgot password + set new password`. `ForgotPasswordScreen`/`Live` on `/forgot-password` (Supabase `resetPasswordForEmail`, redirect to `/reset-password`; always moves on to "Check your inbox" so it never reveals whether an account exists; 429 → "too many tries"), `ResetPasswordScreen`/`Live` on `/reset-password` (waits for the recovery session from the link's `?code=`, then `updateUser({ password })`, min 6, `new-password`, → home; old/used link → "This link has expired" + "Send a new link"; `same_password` has its own copy). The set-new-password page has no canvas frame, so it reuses AU4's layout.
- **Deviation from the plan's file list:** both pages are in a new `src/app/(auth-garden)/`, not `(auth)`: `(auth)`'s layout would wrap classic users' 404 in the navbar and would bounce the recovery link (it arrives signed in). Without the garden flag/cookie both pages `notFound()`, i.e. the same 404 as before; `/login` and `/register` untouched. `AuthShell` gained `titleGap` + `AUTH_BUTTON_CLASSES` (AU1–AU3 output unchanged). Fixtures `AU4-reset-password(-sent)`, `garden:diff` names, `screens.auth.forgot/reset` en/vi/zh (zh draft).
- Checks (scratch mirror in `/var/tmp/dygo-a4/fe` — the device's `/sessions` disk was full): `tsc --noEmit` ✓, `next lint` on the touched dirs ✓, `vitest run` 279/280 — the 1 failure is an outdated `LanguageSheet.test.tsx` case (not A-4; fixed in `806dd12`).
- **Needs Dylan:** add `<site>/reset-password` to Supabase → Auth → Redirect URLs, or the email link falls back to the Site URL.
- Unverified: **no `garden:diff`** for AU4 en/vi (no browser in the device VM); no real reset email / `updateUser` against Supabase; no `next build`. `HEAD.lock` moved to `.git/stale-locks/`; `tmp_obj_*` leftovers. **Next: A-5** (verify + wrap up) — first run `garden:diff --locale en,vi --only AU1-sign-in,AU1-sign-in-error,AU2-create-account,AU3-create-account-invite,AU4-reset-password,AU4-reset-password-sent` on the Mac.
- **A-5** (2026-09-29 ~18:25 UTC), this commit `UI-A A-5: verify and wrap up sign in / create account`. Report only; no code changed (no check failed on UI-A code). §1 UI-A row and the master schedule changelog (5.57) updated, not committed.
- Checks (scratch mirror `/var/tmp/dygo-a5/fe`, Mac `node_modules` symlinked, Linux rolldown binding outside the repo): `tsc --noEmit` app ✓ + `tsconfig.test.json` ✓; `next lint` (whole app) ✓ no warnings; `vitest run` 279/280 — the 1 failure is the same outdated `LanguageSheet.test.tsx` case (not UI-A; fixed in `806dd12`); **`next build` ✓** (26 pages; `/login`, `/register`, `/forgot-password`, `/reset-password` all built). `next start` + curl, unsigned: without the cookie `/login` and `/register` render the classic forms (no `data-ui="garden"`), with `dygo_ui=garden` all four pages render the garden shell.
- Found, not fixed (needs a browser to judge): without the flag/cookie `/forgot-password` and `/reset-password` return **HTTP 200** with a streamed not-found (`NEXT_HTTP_ERROR_FALLBACK;404`) instead of the old plain 404 status; a browser should still show "Page not found", but that and the status code are unverified.
- Unverified: **no `garden:diff`** for any of the 6 AU references (en or vi) and **no Playwright run** — the device VM has no Chrome and can't download one (proxy blocks Playwright/apt hosts), and the repo may not be copied to the cloud. No real Supabase sign-up / sign-in / reset email. Open for Dylan: AU3 banner needs an anon-safe invite preview (A-3), `<site>/reset-password` in Supabase Redirect URLs (A-4), Terms/Privacy URLs (decision 12). **UI-A code complete; next: Dylan's on-Mac check + `garden:diff --locale en,vi --only AU1-sign-in,AU1-sign-in-error,AU2-create-account,AU3-create-account-invite,AU4-reset-password,AU4-reset-password-sent`.**

## SO-1 sign out

- **SO-1** (2026-09-29 ~22:45 UTC), commit `UI-6 SO-1: sign out from the garden Me screen`. A8 `MeScreen` gains a 44px gear `IconButton` (aria-label "Account", `GearIcon`) at the top right of the profile; it opens the new `AccountSheet` (garden `BottomSheet`, page background, no ✕ via the new `closeButton={false}` prop): avatar + name + "Signed in as <email>", outlined terracotta **Sign out** (`SignOutIcon`), **Cancel**. `live/useSignOut.ts` repeats the classic `SignOutButton` steps (default `signOut()`, then `scope: 'local'` if GoTrue fails; classic file untouched), then `queryClient.clear()` → `router.replace('/login')` + `refresh()`; the `dygo_locale` cookie is never touched. "Signing out…" disables both buttons and blocks dismiss; only if even the local sign-out fails does the sheet stay open with a garden Toast (inline, inside the dialog so VoiceOver reads it). `live/AccountSheetLive.tsx` wires it into `MeLive`. `components.account.*` + `screens.me.account` in en-US/vi-VN/zh-CN (zh in the UI-L glossary style). Fixture `A8-me-account` (reference route, `fixtures.ts` `ACCOUNT`, `garden-diff.mjs`); reference count test 24 → 25.
- Checks (scratch mirror `/tmp/dygo-so1/fe`, Mac `node_modules` symlinked, rolldown/vite/vitest copied + Linux arm64 rolldown & lightningcss bindings, all outside the repo): `tsc --noEmit` ✓; `next lint` ✓ no warnings; `vitest run` 285/285 ✓ incl. new `AccountSheet.test.tsx` (5: opens from gear, Cancel closes, Sign out once → cache cleared → `/login`, local fallback, error toast keeps sheet open). `tsconfig.test.json` has 1 pre-existing error in `src/i18n/config.test.ts:61` (not SO-1).
- Unverified: **no `garden:diff`** for A8-me / A8-me-account en or vi (device VM has no browser; its `/sessions` disk is full). Known small deviations from the canvas in the shared `BottomSheet`: grabber 36×5 (canvas 40×5), top radius 26 (`rounded-t-hero`, canvas 28). No real Supabase sign-out run, no `next build`.

## UI-4 finish

- **U4-1** (2026-09-30), commit `365a13c` `UI-4 U4-1: rating previews match rate()`. `computeRatingIntervals(card, now, isNewCard = false, scheduler)` now maps each rating through `gradeFlashcard` (EASY on a new card previews GOOD). `findDue` selects `uws.learning_steps` (`0` for new cards), `DueCard.learning_steps` added, and `withRetrievability` passes the real step + `c.is_new`.
- Note: production config has `learning_steps: []`, `relearning_steps: ['10m']`, so the step only changes previews for Relearning (and legacy Learning) rows: step 1 makes AGAIN preview ~1 day instead of 10 min. The "Learning" test card is built from a relearning card.
- Checks: backend `tsc --noEmit` ✓; jest `fsrs-scheduler.spec` + `srs.service.spec` 61/61 ✓ (new: New/Learning/Review/Relearning × 4 ratings equal `formatInterval(schedule(card, gradeFlashcard(r, isNew)))`, EASY=GOOD on new, real-step test, findDue preview test).
- Housekeeping: git left `.git/index.lock`/`HEAD.lock` (VM can't unlink) → moved to `.git/stale-locks/`; stray `tmp_obj_*` files remain in `.git/objects/`; two probe scripts parked in `.git/claude-scratch/` (untracked, safe to delete).
- **U4-2** (2026-09-30), commit `e53f988` `UI-4 U4-2: /srs/stats stage_counts (new/learning/review/mastered)`. `computeSrsSummary` adds `stage_counts` via extra filters + a scalar subquery on the existing totals query (no new round trip, so positional mocks in `notification.processor.spec` still pass). Mastered wins (as `stageFromSrs`); leeches stay in their stage. `new` = `fsrs_state='New'` rows + READY `topic_words` with no row for `$1` (findDue's rule, RLS-scoped on `/srs/stats`).
- Caveat: on the unscoped NotificationProcessor path the unseen-word subquery isn't RLS-narrowed (value unused there, but it's one extra count per user per cron tick).
- Frontend `SrsStats.stage_counts?` + `SrsStageCounts` (optional for U4-3's fallback); API doc row updated.
- Checks: backend `tsc` ✓; jest `srs.service`/`notification.processor`/`topics.service` 69/69 ✓; frontend `tsc` ✓, `next lint src/types/srs.ts` ✓. Stale `HEAD.lock`/`index.lock` moved to `.git/stale-locks/` again.
- **U4-3** (2026-09-30), commit `4b701fd` `UI-4 U4-3: live garden plants from stage_counts, ripens tomorrow`. `HomeLive` builds A1/A5 plants via new `gardenPlants(stats, slots)` in `live/data.ts`: `stageGarden` (largest-remainder split of `stage_counts`, every non-empty stage ≥ 1 plant; leeches wilt growing plants, `due_now` marks them thirsty); `sampleGarden` stays as fallback when `stage_counts` is missing.
- "Ripens tomorrow": count from existing `useUpcomingActivity(2)` for tomorrow (`todayIn(timeZone)+1`); the screen needs a clock time, so it uses the earliest *enabled* reminder (`useNotificationSchedules`, as MeLive); hidden without one or when 0 ripen. Non-blocking (no extra loading state).
- Not done as written: A5 streak. `WelcomeBackScreen.streak` is the freeze card ("N-day streak is safe" + rain barrel covered/left/refills), and A5 only shows after 2+ missed days, when `current_streak_days` is already 0 — so it stays `null` until freezes (UI-6). Dylan: say if you want a plain streak line on A5 instead.
- Checks (device VM, Mac `node_modules`, Linux arm64 rolldown binding outside the repo via `NAPI_RS_NATIVE_LIBRARY_PATH`): frontend `tsc --noEmit` ✓; `next lint` on the 3 files ✓; Vitest `live/data.test.ts` 10/10 ✓ (3 new). Stale `HEAD.lock`/`index.lock` moved to `.git/stale-locks/`.
- **U4-4** (2026-09-30), commit `6e7eb53` `UI-4 U4-4: Missions v0, water today's thirsty words on A1 and A3`. `live/data.ts`: `thirstyMission(activity, today, due_now, watered?)` → progress = today's `review_count` (or the just-finished session if higher), target = progress + `due_now`, done when nothing is due; `missionsSummary` → A3 Golden Bloom card 1-of-1, no next mission. HomeLive passes the one mission (null → "coming soon" if `/srs/activity` failed); DoneLive once stats + activity load.
- Outside the listed files: `TodaysGardenScreen` gains `MissionItem` kind `'thirsty'` (water row with a fixed title) and uses `missions.goldenBloomOne` when there's 1 mission (avoids "Finish all 1…"); reference fixtures unchanged. New keys `missions.thirsty` / `missions.goldenBloomOne` in en-US, vi-VN, zh-CN (glossary: cần tưới / 缺水; zh still needs native review).
- Note: `review_count` counts reviews, not distinct words, so a word rated Again twice counts twice toward progress.
- Checks: frontend `tsc --noEmit` ✓; `next lint` on 5 files ✓; Vitest `data.test.ts` + `i18n/messages` + `i18n/config` 32/32 ✓ (4 new). Stale `HEAD.lock`/`index.lock` moved to `.git/stale-locks/`.
- **U4-5** (2026-09-30), commit `7300da9` `UI-4 U4-5: classic vs garden parity spec (due, streak, mastered)`. New `automationtesting/ui/tests/parity.spec.ts` (signed in, skips without `.env.e2e`, runs on `iphone-se` only): opens `/` with `dygo_ui=classic` and `/garden` with `dygo_ui=garden`, captures the `GET /srs/stats` each home loaded, expects equal `due_now` / `current_streak_days` / `mastered_words`, the classic "N-day streak" label visible, and `stage_counts.mastered = mastered_words`.
- Compares what each home loaded rather than scraping garden numbers (the garden screens have no test ids); a follow-up could add `data-testid`s for on-screen checks.
- Checks: backend jest `src/modules/srs` 77/77 ✓; frontend `tsc --noEmit` ✓, `next lint` on `live/HomeLive.tsx`, `DoneLive.tsx`, `data.ts` ✓, Vitest `garden/live` + `i18n` 6 files / 54 ✓ (Linux arm64 rolldown binding outside the repo via `NAPI_RS_NATIVE_LIBRARY_PATH`); ui `tsc` ✓, `playwright test --list` shows the spec. Playwright not run (Mac).
- Plan: UI-4 checklist ticked except the beta; §1 row + Status updated. G2 open: apply migrations from `20260926_*`, `npx playwright test` on the Mac, 3–5 beta users with `?ui=garden` for a week.
- Housekeeping: `HEAD.lock` moved to `.git/stale-locks/`; `tmp_obj_*` left in `.git/objects/`. Working tree already had uncommitted deletions under `com.dygoacademy.automationtesting/` (`api/`, root `package.json`, `.env.e2e`…) and a `backend/` folder there; untouched, not staged.
- **Mac Playwright after UI-4** (Dylan, 2026-10-01 ~06:45 SGT): 421 passed / 28 failed / 7 skipped (parity runs on iphone-se only, by design). Parity spec ✅. All 28 failures = A1 + A5 reference pages (en + vi) on 7 viewports, from `48912ed` (hero plants scale with card width); iphone-16 (358px card = canvas) unchanged and passing. Baselines regenerated with `--update-snapshots` (32/32 ✅, ~07:00 SGT). `tests/__screenshots__/` is gitignored, so nothing to commit.

## UI-6 finish

- **U6-1** (247d92d): `database/migrations/20261001_retention.sql` — `daily_missions` (unique user+date+type, type/target/progress checks), `streak_freeze_uses` (unique user+date), `user_keepsakes` (unique user+kind+value), profiles `streak_freezes_available` (0–2, def 2), `freezes_refilled_on`, `english_variety` (en-US/en-GB), `daily_goal_minutes` (1–120, def 10).
- RLS own rows only: missions select/insert/update; freeze uses + keepsakes select/insert; no delete; anon revoked; service_role full.
- `database/tests/rls_retention_test.sql`: 37 assertions (shape, defaults, anon, owner writes, constraints, Priya/Dana see nothing and can't write/hand over Alex's rows).
- Not run: no Postgres in this session. Dylan: apply the migration and run the RLS test.

**U6-2 (bc9c73d, 2026-10-01):** (U6-4 was requested, but U6-2 was the earliest missing step, so U6-2 was done instead.)
- New `modules/missions`: `GET /missions/today` → `{ date, missions[], goldenBloom }` (rows created on first read, learner time zone) and `GET /missions/week` → 7 × `{ date, done, goldenBloom }`.
- Progress is bumped inside `applyReview`'s transaction: graded flashcard review → LEARN_NEW (new card) / REVIEW_DUE; quiz answer with new optional `final: true` → QUIZ.
- Choice made: the backend had no "quiz finished" signal, so `SubmitAnswerDto.final` was added; U6-5 should send it on the last item.
- Checks: backend `tsc` clean, eslint clean, jest missions/srs/quiz 124/124.

**U6-4 (a66e3bb):** `GET /me/keepsakes` (new `MeController` in the profiles module) awards lazily from `SrsService.stats` (first mastered word, best streak 7/30/100) and Golden Blooms (local days with 3 completed `daily_missions`), `on conflict do nothing`, returns `{ earned, next, golden_blooms }`. `GET /profiles/me` added; `PATCH /profiles/me` accepts `englishVariety` (en-US/en-GB) and `dailyGoalMinutes` (int 1–120), null rejected (NOT NULL columns). Checks: backend `tsc` clean, profiles jest 14/14. API doc rows updated. Classic screens untouched. Note: git left `tmp_obj_*` files in `.git/objects` and `HEAD.lock` (moved to `.git/stale-locks/`) because the VM can't delete; harmless, `git gc` clears them.

**U6-6 (d1e24ce, 2026-10-01):** (U6-8 was requested, but U6-6 and U6-7 had no commits, so U6-6 was done instead.) The U6-6 changes were already staged from an interrupted pass; checked and committed as they were.
- A4 `HarvestLive`: harvest from `GET /missions/week` mapped onto the calendar week (`weekHarvest`: missions per day 0–3, today marked, future days empty, done/21); rain barrel = stats `freezes.available`; goal stays "coming soon"; either call failing keeps "coming soon".
- A5 `HomeLive`: freeze card from `freezeStreak(stats)`, shown only when `freezes.used_this_week > 0` and the streak is alive.
- Checks: frontend `tsc` clean, `next lint` clean on the 4 files, Vitest `data.test.ts` 19/19 (VM run used a Linux rolldown binding from outside the repo via NODE_PATH).
- Stale `.git/index.lock` + `HEAD.lock` moved to `.git/stale-locks/`. Unrelated working-tree changes left alone (unstaged `package.json` drops the `build` script; many `com.dygoacademy.automationtesting` files show as deleted). Next: U6-7, then U6-8.

**U6-7 (`1a4a770`, 2026-10-02).** A8 Me live: `MeLive` passes best streak (`best_streak_days`), Golden Blooms + keepsakes (`GET /me/keepsakes`, earned then the closest next streak/bloom, 4 max), the 16-week calendar (missions per day from `/missions/week`).
- Daily goal row → new `DailyGoalSheet` (5/10/15/20/30 min, saves `dailyGoalMinutes`); Language sheet gains an optional "English style" group (US/UK, saves `englishVariety`), both `PATCH /profiles/me`, optimistic. New hook `hooks/useProfile.ts`. Family hidden; "in the garden" hours still "—".
- `MeScreen`: optional `onDailyGoalClick`, `href` optional, new `nextStreak`/`nextBlooms` keepsakes; reference/fixture pages unchanged. Strings in en-US/vi-VN/zh-CN.
- Limit: `/missions/week` covers 7 days, so older calendar days show 0 (missions only exist since 2026-10-01); a `?days=112` backend option would fill it later.
- Checks (device VM): app `tsc` ✓; test `tsc` only the old `src/i18n/config.test.ts:61` error; `next lint` touched files ✓; Vitest 51/51 touched + i18n 25/25 in a `/tmp/vt` npm ci mirror (nothing written to the Mac's `node_modules`).
- Not verified: live `/garden/me` with a signed-in learner, `garden:diff` A8 (U6-8). Stale git locks moved to `.git/stale-locks/`.

**U6-7b (c96515a, 2026-10-02):**
- A3 Mission complete: `DoneLive` passes `reminder` — `ripening` = tomorrow's `due_count` (`useUpcomingActivity(2)`), time/on from the earliest schedule; no schedule → off at 20:00 (classic default). Hidden only when the browser has no Web Push (and while schedules load).
- New garden hook `live/useReminderSwitch.ts`, shared by A3 and A8: turning on runs the Web Push prompt + subscribe (`usePushSubscription`) if not subscribed, then upserts (creates the schedule if none); a refused prompt leaves it off. Off = upsert `is_enabled: false` (same as A8 before; no delete). MeLive now uses it (Me still hides the row with no schedule).
- Pure helpers `earliestSchedule`, `doneReminder`, `DEFAULT_REMINDER_TIME` in `live/data.ts` (+3 Vitest). No new strings; fixture/reference pages untouched.
- Checks (device VM, linux-arm64 rolldown/lightningcss bindings in `$HOME/tmp/vtb` via `NODE_PATH`, nothing written into `node_modules`): app `tsc` ✓; test `tsc` only the old `src/i18n/config.test.ts:61` error; `next lint` (5 files) ✓; `data.test.ts` 24/24 ✓.
- Not verified: real push prompt/subscription in a browser. Git left unremovable `tmp_obj_*` files in `.git/objects` (no delete permission on the VM) and a `HEAD.lock`, moved to `.git/stale-locks/`.
- Try on the Mac: finish a review → Mission complete → switch on (allow notifications) / off, then Me shows the same reminder.

**U6-8 (`8f1ca2f`, 2026-10-02): UI-6 wrap-up — code complete.**
- Backend `tsc` ✓; jest missions/srs/profiles/quiz 7 suites, 144/144 ✓.
- Frontend app `tsc` ✓; test `tsc` failed on the old `src/i18n/config.test.ts:61` (2nd arg left over from en-SG removal) → fixed in `8f1ca2f`, now ✓; `next lint` ✓; Vitest 35 files, 328/328 ✓ (copy in VM `/tmp/fe` with linux-arm64 rolldown/lightningcss bindings, deleted after; nothing written to the Mac's `node_modules`).
- `apply-migrations.sh --test` now applies `20261001_retention.sql` to the scratch db and runs `rls_retention_test.sql` after `rls_test.sql` (script had no uncommitted edits). Not run here: no Postgres.
- Plan: UI-6 checklist ticked except "RLS suite passes" (needs the Mac run); U6-8 ✅, §1 row and Status updated. Stale `HEAD.lock` moved to `.git/stale-locks/`.
- Dylan 2026-10-02: `./database/apply-migrations.sh --test` ✓ (retention RLS assertions all passed). Playwright 552 ✓ / 25 ✘ / 7 skipped: 8× `gallery vi-VN` render in English (signed-in profile `ui_locale` en-US beats the `dygo_locale` cookie — test setup, not U6); 17× ipad-13-landscape AU*/GR1–3 (1-min waits then recovered, same pages pass on 7 other viewports — a dev-server stall: rerun of ipad-13-landscape 71 ✓, only `gallery vi-VN` ✘). `garden:diff` (local = UAT): A1/A3/A4/A5/A8-me en+vi pass (0.19–0.49%); A8-me-account 3.63% / vi 3.83% FAIL → `84f7853` fixes the Account sheet spacing (measured offsets: sheet 10px taller, title→card 8px short, Cancel box 24px too tall); UAT after deploy: 0.822% / vi 0.916% (sheet top + grabber 4px low, 26 vs 28px corners) → `e8fea77` scoped to the Account sheet. **UAT re-diff: all 12 pass** — A1 0.311/vi 0.264, A3 0.195/0.185, A4 0.491/0.423, A5 0.355/0.353, A8-me 0.449/0.342, A8-me-account 0.345/0.379%. Real-iPhone check ✓ (Dylan 2026-10-02: missions, Golden Bloom, rain barrel, reminders, Me incl. gear → Account → Sign out). UI-6 done; `gallery vi-VN` Playwright locale clash fixed by Dylan. Nothing open. Still to do: in `com.dygoacademy.automationtesting/ui` (en-US account); `garden:diff` A1/A3/A4/A5/A8 en+vi; real-iPhone check of missions, Golden Bloom, rain barrel, reminders, Me.

## UI-5 quiz design

**QZ-1 (`d924173`, 2026-10-01).** QuizScreen to canvas Q1–Q5: sentence split on `_____` with the inline gap pill (empty / green / gold), MATCHING question in the app language + asked word (fallback to the text), DICTATION 84px play button + `listenQ`, options/field/Check/hint/feedback panel sizes from the references; the panel names the asked word for MATCHING and shows `word · definition` (explanation, else hint definition) when wrong.
- Fixtures `/garden/_reference/Q1-quiz-choose` … `Q5-quiz-listen` (en-US, vi-VN, zh-CN; new `initialAnswer` / `initialPick` props for Q2–Q4), names added to `garden-diff.mjs`; messages `matchQ`, `matchQAntonym`, `listenQ` in all three files (zh-CN still needs the native review).
- Checks: app `tsc` clean; test `tsc` has one error in untouched `src/i18n/config.test.ts:61` (already at HEAD); eslint clean on touched files; Vitest quiz + screens + i18n + routes 72/72 (after updating screens.test's reference count 25 → 30), run in a scratch mirror outside the repo.
- Not verified: pixel diff (QZ-3 on the Mac), real fonts. Git couldn't unlink its tmp objects / `HEAD.lock` in the shared folder; the locks were moved to `.git/stale-locks/`.

**QZ-2 (`956dd43`, 2026-10-01).** QuizResultScreen to canvas Q6–Q8: 148px forest circle with the watering-can (missed > 0) or bloom art (new `garden/quizArt.tsx`, paths from the Q6/Q7 references); tiles via new StatTile `size="lg"` (26/13px, 12×14 padding) + `tone="muted"` for 0 (md/sm callers unchanged); missed card drop `#1D6A9A`, 5px chips, note lh 1.4; Drill 56px secondary only for a normal quiz with misses.
- Fixtures `/garden/_reference/Q6-quiz-result`, `Q7-quiz-result-perfect`, `Q8-quiz-drill-done` (existing messages already match the en/vi references), names added to `garden-diff.mjs`; screens.test count 30 → 33.
- Checks (scratch mirror outside the repo): app `tsc` clean; test `tsc` same pre-existing `config.test.ts:61` error; eslint clean on touched files; full Vitest 313/313.
- Not verified: pixel diff (QZ-3 on the Mac), real fonts. `QuizLive` still passes no `drillHref`, so the live Drill button stays hidden until QZ-4 wires it. Stale `HEAD.lock` moved to `.git/stale-locks/`.

**QZ-3 (🟡 not done, 2026-10-01, no commit).** QZ-1 `d924173` and QZ-2 `956dd43` present. The `garden:diff` for Q1–Q8 en-US/vi-VN could not run, so no numbers and no layout changes (nothing guessed).
- Why: the device VM has no Chrome/Chromium; Playwright's browser CDN (cdn.playwright.dev, playwright.download.prss.microsoft.com) is unreachable through the proxy; `/sessions` has 190 MB free (98% full); the VM can't reach a `next dev` on the Mac's localhost (no server on :3000). Repo not copied to the cloud sandbox.
- Next for Dylan on the Mac: `npm run dev` in com.dygoacademy.frontend, then `npm run garden:diff -- --base http://localhost:3000 --cookie dygo_ui=garden --locale en-US,vi-VN --only Q1-quiz-choose,Q2-quiz-right,Q3-quiz-not-quite,Q4-quiz-cloze-hint,Q5-quiz-listen,Q6-quiz-result,Q7-quiz-result-perfect,Q8-quiz-drill-done`; then rerun QZ-3 to fix anything > 0.5% and fill the README table.

**QZ-4 (`a95b5e2`, 2026-10-01).** Wrap-up. QZ-1 `d924173`, QZ-2 `956dd43` present; QZ-3 still 🟡 (pixel diff needs the Mac), done here anyway since QZ-4 doesn't depend on it.
- Wiring: `QuizLive` passed no `drillHref`, so live "Drill tricky words" never showed; now `GARDEN_ROUTES.quiz(topicId, 'leech')` for a normal quiz, null in the drill. Hint definition (wrong panel) and the matching word were already wired through the `hint` / `question` props.
- Checks (device VM, Mac `node_modules`, Linux arm64 rolldown/lightningcss bindings from `/var/tmp/dygo-a5/nb` via `NAPI_RS_NATIVE_LIBRARY_PATH`/`NODE_PATH`, nothing written into the repo): app `tsc` ✓; test `tsc` only the old `src/i18n/config.test.ts:61` error; `next lint` ✓; Vitest 313/313 ✓ (garden + app 279/279 after the fix).
- Not verified: live `/garden/quiz?topic=…` (no browser/dev server on the VM), Q1–Q8 pixel diffs (QZ-3), real fonts. Stale git locks moved to `.git/stale-locks/`.
- Next for Dylan on the Mac: QZ-3 diff command above, then try a bed → Quiz → each question type → results → Drill, in English and Tiếng Việt.

**U6-3 (828a74b, 2026-10-01, catch-up U6-9):**
- `computeSrsSummary` (so `GET /srs/stats` and the notification worker): lazy weekly refill to 2 on the learner's local Monday, then auto-freeze of the current gap (days after the last studied/frozen day up to yesterday) when the freezes left cover all of it; one statement writes `streak_freeze_uses` rows + `profiles.streak_freezes_available/freezes_refilled_on`.
- A frozen day keeps the streak but doesn't add to it; new `best_streak_days` (frozen days bridge) and `freezes: { available, used_this_week, refills_on }`.
- Choice made: a gap longer than the freezes left spends none (the streak is lost anyway).
- API doc + frontend `types/srs.ts` (optional fields). Checks: backend `tsc` clean, jest srs/notification/missions/quiz 135/135 (6 new freeze tests); frontend `tsc` + lint on `types/srs.ts` clean.
- Needs `20261001_retention.sql` applied, or `/srs/stats` fails on the new profile columns.

## UI-8 finish

### U8-1 (2026-10-02, automated pass) — ✅ `bc999be`
- (a) Inventory: every "Remove" row has a garden replacement in `src/` — Home `garden/page`, Review + `RatingBar`, `BottomSheet`, Topics + Topic bed + `AddWordSheet`, Me (`GardenCalendar`, `SettingsList`, `useReminderSwitch`), `WeekHarvest`/`HarvestLive` (missions), `BottomTabBar`/`GardenRail`/`GardenSidebar`. No gaps.
- (b) Blocked: there is no classic tenant director rollup page to restyle. `GET /analytics/tenant/heatmap` exists only in the backend; no frontend file calls it. The only classic heatmap UI is the per-group `GroupHeatmapSection` in `(dashboard)/analytics/page.tsx` (a Remove row; garden GR3 `TrickyPatchRow` replaces it). No canvas reference for a director rollup exists either.
- Decision needed (Dylan): (1) drop the rollup restyle and mark U8-1 done, or (2) build a new garden director rollup screen (needs a canvas reference first). Until then the U8-2 pass will hit the same stop.
- Resolved: Dylan chose option 1 — rollup restyle dropped, U8-1 done as an empty marker commit `bc999be` (no code change, so no tsc/lint/Vitest needed).

### U8-2 (2026-10-02, automated pass) — ✅ not committed
- `env-profiles/prod.env`: appended `NEXT_PUBLIC_GARDEN_UI=true` (+3 comment lines). The file is gitignored (live R2 credentials), so there's nothing to commit. Its earlier contents were left untouched.
- Code check: `lib/garden-ui.ts` `isGardenEnabled()` returns false for the `dygo_ui=classic` cookie before reading the flag, and the middleware sets that cookie from `?ui=classic` on the same request, so classic still beats the flag. The flag is `NEXT_PUBLIC_*` (inlined at `next build`; `build:prod:domain` sources `prod.env`), so it takes effect only after a rebuild and redeploy.
- Checks (scratch copy in `/tmp` with linux-arm64 bindings, deleted afterwards): `tsc --noEmit` clean; Vitest `routes`, `routeStates`, `BottomTabBar` and a scratch-only flag test (flag on → garden, `classic` cookie → classic; flag off → classic) 26/26. No repo Vitest file covers `garden-ui` itself.
- Not done: deploy (Dylan), `next build`, Playwright, real devices. Note: `com.dygoacademy.frontend/package.json` has someone else's uncommitted change (the `"build"` script removed); it was left alone.
- Dylan: deploy via `deploy/request.md`, then on UAT check `/` lands on the garden (signed out and signed in), `?ui=classic` shows classic, Playwright incl. parity.spec, iPhone + iPad. Rollback: flag back to false, redeploy.

### U8-3 (2026-10-02, Dylan in session, run early before G3) — ✅ `62bb379` (+ `69c00c9` `?ui=classic` removed)
- Deleted 46 files (−5.9k lines): `(dashboard)/**` incl. groups/join, `components/{topics,settings,groups,quiz}`, flashcard RatingButtons/ProgressiveClues/WordCardModal, `Navbar`/`PublicNavbar`/`SignOutButton`, ClassicLogin/Register, `lib/garden-ui.ts`, `CONTENT_WIDTH`, the classic HSL palette and `--radius`.
- Garden tokens now also on `:root`; shadcn colour names in `tailwind.config.ts` point at them (`components/ui/*`, `/search`, error pages keep working — colours changed, not checked visually). Flag + `?ui=` gone; middleware redirects signed-in `/`, `/join/<token>` and old classic paths into `/garden/...`.
- Kept (not Remove rows): `/search` guest trial with `flashcard/Flashcard` + `AudioButton`. Garden links to classic `/topics/<id>`, `/quiz` repointed to `GARDEN_ROUTES`; topic bed "options" button now has no target.
- Checks: tsc app + test clean (stale `.next/types` ignored), `next lint` clean, Vitest 35 files / 328 tests (scratch mirror in `/tmp`, deleted). grep of removed names in `src/` empty (garden's own `GroupCard` is a different component).
- Not done: `next build`, Playwright (fixtures still send a harmless `dygo_ui=garden` cookie), pixel diffs, deploy. Rollback: `git revert 62bb379` (+ `69c00c9`) and redeploy.

### U8-4 (2026-10-02, automated pass) — ✅ `cb6026a`
- Renames, 86 files, done by script: `garden-` colour prefix dropped (`bg-garden-surface` → `bg-surface`); `text-garden-muted` → `text-muted-foreground`; clashes renamed `garden-dashed` → `dashed-line`, `garden-card-lift` → `card-lift-bg`; `garden-border`/`garden-primary` merged into `border`/`primary` (same variable). Motion `garden-drip/bloom/rise/rain` (+ keyframes) → `drip/bloom/rise/rain`, `fade-in`.
- Screens: `medium:` → `md:` (600px), `expanded:` → `lg:` (1024px); the old 768px `md:` (`/search`, `ui/navigation-menu`) → new `tablet:`. `GARDEN_CONTENT_WIDTH` → `CONTENT_WIDTH`.
- No visual change: compiled Tailwind CSS before/after has the same 790 declaration blocks (only animation names differ).
- Checks: tsc app + test clean, `next lint` clean, Vitest 35 files / 328 tests (scratch mirror in `/tmp`, deleted). grep leftovers are not Tailwind: `(garden-reference)`, `data-garden-nav`, `garden-locale`/`garden-auth` modules, form/label ids, `/groups/garden-counts`, `/garden-reference/*.mp3`, `__garden-ui-disabled`, `ease-garden`, comments.
- Not done: `next build`, Playwright, pixel diffs, deploy. Dylan: `npm run garden:diff -- --locale en-US,vi-VN` on every reference; numbers must match the pre-rename ones. Rollback: `git revert cb6026a`.

### U8-5 (2026-10-02, automated pass) — ✅ `9a95ce7`
- Short URLs (decision 1): route folders `git mv`'d from `(garden)/garden/` to `(garden)/` → `/review`, `/review/done`, `/topics/**`, `/missions`, `/me`, `/groups/**`, `/quiz`, `/join/**`; `/garden` stays home; `_reference`/`_gallery`/`_tokens` stay under `/garden`. error/loading/not-found moved up to the `(garden)` group.
- `GARDEN_ROUTES` → short paths; `PROTECTED_PATH_PREFIXES` = `/`, `/review`, `/topics`, `/missions`, `/me`, `/groups`, `/quiz`, `/join`, `/garden`.
- Middleware: new `legacyRedirect()` (routes.ts) answers **308** for `/garden/<x>/**` → `/<x>/**`, `/study` → `/review`, `/analytics`/`/settings` → `/me` (query kept), before the session check; signed-in `/` → `/garden` stays 307 (session-dependent). Invite links were already `/join/<token>`.
- Checks: tsc app + test clean, `next lint` clean, Vitest 35 files / 363 tests (scratch mirror in `/tmp`, deleted); Playwright `ui` tsc clean. `grep "/garden/" src` URL hits: home, the redirect code/tests, `_reference`/`_gallery`/`_tokens` (plus `@/components/garden/` imports and `docs/design/garden/` comments).
- Playwright: `navigation.spec` uses `/topics`, `/groups` + new redirect test. `parity.spec` still compares classic `/` (gone since U8-3) — left for U8-6/Dylan.
- Not done: `next build`, Playwright run, deploy. Rollback: `git revert 9a95ce7`.

### U8-6 (2026-10-02, automated pass) — ✅ `bac901a`
- Checks, no fixes needed: frontend tsc app + test config clean, `next lint` clean, Vitest 35 files / 363 tests (Linux mirror in `/tmp`, deleted), backend tsc clean.
- Docs (committed): frontend architecture §3 tree, §4 URL table + 308 redirects, §16 breakpoints (md 600 rail / tablet 768 / lg 1024 sidebar / short), §17 `CONTENT_WIDTH`; API surface UI-8 note (no route changes); UAT checklist URL mapping + redirect/device checks; README endpoints + garden-only note.
- Plan: UI-8 checklist ticked, U8-6 ✅, §1 UI-8 done; Phase 12 done apart from Dylan's checks.
- Notes: backend push links still send `/study` (redirects to `/review`, works); Playwright `parity.spec` still compares classic `/` (gone) — skip or delete; `package.json` has someone's uncommitted removal of the `build` script (left alone; use `npx next build`).
- Not done (Dylan): deploy, `next build`, full Playwright, `garden:diff` en+vi all references, real iPhone/iPad incl. old-link redirects.

## Home page

### HP-1 (2026-10-02, automated pass) — ✅ `627019d`
- Public home page at `/` for signed-out visitors: `components/home/HomeScreen.tsx` (props only; phone layout below `lg`, max 560 centred; desktop from `lg`, max 1280, 64px padding), `homeArt.tsx` (reference SVG paths), `HomeLive.tsx` (chip sets `dygo_locale` like AU1), `app/(home)/` layout via `GardenRoot` (no session) + page metadata/Open Graph.
- Middleware: guest `/` now renders the page (no `/search` bounce; `/search` unchanged); signed-in `/` → `/garden` moved into `updateSession` (cookies carried), so `src/middleware.ts` lost its own `/` branch.
- Messages under `screens.home.public.*` (not bare `screens.home.*`: that key is already the garden's Today screen); en/vi copy from the references, zh-CN draft (decision 8). `LanguageChip` got an optional `className` (home chip is 36px vs 38px).
- Checks: tsc (app + test config) clean, `next lint` clean on the changed files, Vitest full suite 374/374 in a /tmp mirror (new: HomeScreen 6, middleware 5).
- Not verified: real rendering/fonts, `next build`, live signed-in/out flows. Baloo 2 isn't self-hosted yet, so the kids prompt falls back to the body font; the reference's sway/drip/fly animations aren't built (references render static) — both may matter for HP-3's diff.
- Left behind: `.git` temp objects the VM couldn't unlink (harmless); stale locks moved to `.git/stale-locks/`.

### HP-2 (2026-10-02, automated pass) — ✅ `73122b9`
- Fixtures `/garden/_reference/H1-home-phone` and `H2-home-desktop` (`?locale=`): `HomeScreen` with the `screens.home.public` copy in a 390 / 1280 frame (`HOME_REFERENCE` in `fixtures.ts`), layout forced by the fixture.
- How it's forced: `HomeScreen` gained `layout` (auto | phone | desktop → `data-home-layout`); its 55 `lg:` classes became `home-lg:`, a Tailwind plugin variant (`tailwind.config.ts`) = `lg` unless an ancestor forces a layout. Live page stays `auto` (same CSS at ≥1024px). Checked in the generated CSS. HomeScreen wasn't in the step's file list, so flagging it here.
- `scripts/garden-diff.mjs`: viewport = reference PNG size / 2 (new `scripts/garden-diff-size.mjs`), full board shot; A/GR/AU/Q stay 390 × 844; H1/H2 in the list. Vitest include now also `scripts/**/*.test.mjs`.
- Checks: tsc clean, eslint clean on changed files, Vitest full suite 381 tests, all pass after updating the reference-count test 33 → 35 (new: size helper 6, HomeScreen layout 1). Ran on the VM with a Linux rolldown binding kept outside the repo (NODE_PATH), nothing added to `node_modules`.
- Not verified: the fixtures in a real browser / the diff itself (HP-3). The diff against `www.dygoacademy.com` needs that build to have `GARDEN_REFERENCE_PAGES=on`, or the reference pages 404.
- Left behind: `.git` temp objects the VM couldn't unlink (harmless); stale `index.lock` / `HEAD.lock` / `maintenance.lock` moved to `.git/stale-locks/`.
### HP-3 (2026-10-02/03) — fixes committed `899b27f`, waiting for Dylan's live re-run
- Live run: H1 8.98 / H2 3.79 / H1-vi 7.84 / H2-vi 3.75 %. Causes: the canvas has no box-sizing reset (stage art 84 px, kids tiles 102/126, chip 38), its SVGs are inline on the baseline (list stars, hero plants: preflight made ours block), and Baloo 2 wasn't self-hosted.
- Fixed in HomeScreen + Baloo 2 800 self-hosted (`(garden)/fonts`, @fontsource 5.3.0, OFL) + `--font-stack-kids`. Only those 3 lines of `globals.css` are committed; the file's other uncommitted change (text-field focus ring, not ours) is left unstaged.
- Local diff (cloud copy, `next dev` + Chromium 1194): H1 0.418, H2 0.184, H1-vi 0.423, H2-vi 0.172 % — all pass; what's left is text anti-aliasing. tsc / Vitest 381 / lint clean.
- To do once the live run passes: README diff table, HP-3 row ✅.

## Home page v2

### HP-6 (2026-10-03, automated pass) — ✅ `40cd48b`
- Hero "Plant a word": `PlantAWord` (idle → planting 400 ms → sprouting 600 ms → bloomed; reduced motion blooms at once; `aria-live` card, focus to the card heading), `plantWords.ts` (8 words, G-home definitions, vi/zh meanings), save → `/register?seed=<word>`, unknown words → `plant.unknown`. Copy/sizes from H3/H4 + H3s-plant-bloomed (en + vi).
- `HomeScreen` hero replaced (sign-up buttons desktop only, v1 hero scene removed); `homeArt` adds `PlantPot`/`PlantSeedIcon`; metadata title v2, description = `hero.lead` (`metaDescription` removed). en-US/vi-VN/zh-CN updated (zh drafts, decision 8).
- Checks: `tsc --noEmit` app + test config clean; `next lint` on the 7 touched files clean; Vitest `PlantAWord` (11) + `HomeScreen` (7) + `i18n/messages` (5) pass (run in a /tmp linux-arm64 mirror, deleted after).
- Not verified: pixel diff (HP-11), `next build`, Playwright, real phone. Not in the references, so built from the plan: the `planting`/`sprouting` frames and the unknown-word card layout. Header nav "Questions" left for HP-9.

### HP-7 (2026-10-04, automated pass) — ✅ `bf50bd9`
- "Sound familiar?": `PainCards` after the hero (4 `<button aria-pressed>` cards, 2 × 2 phone / 4 in a row desktop, both faces in the DOM, hidden face `aria-hidden`, 450 ms 3D flip, 150 ms crossfade with reduced motion; Enter/Space handled so one key = one flip). Back copy and plant glyphs from the LandingV2 sources (references only show the `forget` back).
- How your words grow v2: `GrowthStages` (4 stage cards with what it means / Reviews / Grows when, Fruiting "Stays that way if", arrows column/row, reviews-spread strip, two tips) replaces the v1 stage cards; `homeArt` adds flip hint, wilted sprout, grow-up and stage arrows. Old `how.<stage>.text` keys replaced by `how.stages.*`; en/vi from H3/H4 + `-vi`, zh drafted (decision 8).
- Checks: `tsc --noEmit` app + test config clean; `next lint` on the 7 touched files clean; Vitest `PainCards` (6), `GrowthStages` (2), `HomeScreen` (7), `PlantAWord` (11), `i18n/messages` (5) pass (/tmp linux-arm64 mirror, deleted after).
- Not verified: pixel diff (HP-11), `next build`, Playwright, real phone. `HomeScreen` has a `flippedPains` prop ready for the H3s-pain-flipped fixture. Git couldn't delete its own temp files during the commit (no delete permission): `HEAD.lock` moved to `.git/stale-locks/`; a few `.git/objects/*/tmp_obj_*` files are left (harmless; `git gc` clears them).

### HP-8 (2026-10-04, automated pass) — ✅ `8b21094`
- "What do you need English for?": `UseCaseBeds` after How your words grow (section `#uses`): `tablist` of 5 beds (Work default, arrows/Home/End move selection + focus, roving tabindex), one `tabpanel` with wooden sign, bed of 5 plant tiles (3 per row phone, 5 desktop), line + "Start with these words" → `/register`. Sizes/colours from H3/H4 + LandingV2 sources.
- Decision 15: Work, Travel, Daily life `ready: false` → "Coming soon" badge + "Until then, start with your own words."; Study & IELTS ready. "My own words" = 5 empty seed tiles with the manual line (as in the references); `aiFill` prop switches to "Dygo adds the meaning and examples" once AI fill-in is confirmed on UAT (vi/zh of that line drafted, not on the canvas).
- `useCaseWords.ts` (25 words, stage, vi from `-vi` boards, zh drafted); en-US shows no meaning line. `homeArt`: 5 tab icons + add-word plus. `HomeScreen` gets `useCaseBed` for the H3s-uses-travel fixture. vi button is "Bắt đầu luống này" per the `-vi` boards.
- Checks: `tsc --noEmit` app + test config clean; `next lint` on 6 touched files clean; Vitest `src/components/home/` 5 files / 32 tests pass (incl. new `UseCaseBeds` 6) in a /tmp linux-arm64 mirror (deleted after); message keys match across en/vi/zh (`messages.test` not re-run).
- Not verified: pixel diff (HP-11), `next build`, Playwright, real phone. `HEAD.lock` moved to `.git/stale-locks/`; a few `tmp_obj_*` files left in `.git/objects` again (no delete permission).

### HP-9 (2026-10-04, automated pass) — ✅ `4dcd571`
- FAQ "Common questions" (`HomeFaq`, section `#faq`): 7 native `<details>`, first open, plus turns 45° when open; phone one column, desktop two independent columns as on H4 (odd left / even right, `order` restores reading order on the phone, so phone focus order follows the DOM columns). `FAQPage` JSON-LD per locale from the same messages, rendered in `(home)/page.tsx`.
- Seed packet CTA (`SeedPacketCta`, `SeedPacketArt` in `homeArt`) replaces the facts row and the v1 forest CTA; desktop adds "I already have an account". Hover/focus: flap tears + 3 seeds (CSS, off with reduced motion) and the Free tag tips like the boards' `.pk:hover`. The tear isn't on the canvas, so built from the plan.
- Planted word: `PlantAWord` got an `onPlant` prop (small edit outside the listed files); `HomeScreen` stores it in `sessionStorage` (try/catch, read after mount) → CTA `/register?seed=<word>`. Header nav adds Questions. Old `facts.*` and `cta.lead` keys removed; en/vi from H3/H4 + `-vi`, zh drafted.
- Checks: `tsc --noEmit` app + test config clean; `next lint` on 9 touched files clean; Vitest `HomeFaq` (4), `SeedPacketCta` (4), `HomeScreen` (9), `PlantAWord` (11) pass in a /tmp linux-arm64 mirror (deleted after; TMPDIR pointed into it because the session tmp volume was full).
- Not verified: pixel diff (HP-11), `next build`, Playwright, real phone. `HEAD.lock` moved to `.git/stale-locks/`; `tmp_obj_*` files left in `.git/objects` again.

### HP-10 (2026-10-04, automated pass) — ⏭ dropped
- No code and no commit. The plan relied on a "My words" bed, which doesn't exist: a new learner has no group or topic, `POST /words` needs `topicId`, and it can't store the meaning or example.
- Dylan decided the landing page is marketing only and makes no backend calls, so HP-10 is dropped and the plan row is marked ⏭.
- The `/register?seed=<word>` links from HP-6 and HP-9 stay. Register ignores `seed`, which does no harm. Next: HP-11.

### HP-11 (2026-10-03, interactive pass) — ✅ `9b4ee0d`
- Fixtures `/garden/_reference/` H3-home-v2-phone, H4-home-v2-desktop, H3s-plant-bloomed ("deadline"), H3s-pain-flipped (forget), H3s-uses-travel. They use the existing HomeScreen start-state props, and `?locale=` works as before.
- `garden-diff.mjs`: the five v2 boards replace the H1/H2 jobs. The H1/H2 fixtures and PNGs stay. Reference count test is now 40, and each of the 40 has a PNG.
- New `automationtesting/ui/tests/home.spec.ts` (signed out): plant a chip, flip the forget card, select Travel, open an FAQ item, CTA goes to `/register`.
- Checks: `tsc --noEmit` passes for the app, test and ui configs; `next lint` on the touched files is clean. Vitest didn't run: the VM disk is full and npm blocked the linux rolldown binding.
- Not verified: pixel diff ≤ 0.5%, Playwright (new reference snapshots need `--update-snapshots`), Lighthouse, real phones. All need a deploy (Dylan).
- `HEAD.lock` moved to `.git/stale-locks/`. `tmp_obj_*` files are left in `.git/objects`.
- First diff on www (after the deploy): en 10.1–10.5% phone / 2.9% desktop, vi 4.4% / 2.9%. Fixed in `9cb4617`: en features and parents copy from the reference, pain card height (only the face shown counts), hero pot and stage icons inline, features desktop `pt` 24px. Needs a deploy and a re-run. `_cmp*.png` scratch crops are left in `.garden-diff/` (the VM can't delete files).

## UI-7 finish

### U7-1 (2026-10-03, automated pass) — ✅ audit, no commit
- Exists: rail (`md`) + sidebar (`lg`) in `GardenTabBar` with tests, but `NEXT_PUBLIC_GARDEN_IPAD_NAV` is **not** in `prod.env` (off); `RatingBar` keys 1–4; meaning line with `lang`; Esc closes sheets; focus ring, progressbar text, reduced motion on drip/bloom/rise/rain.
- Gaps written into the plan's U7 rows: U7-2 no screen has `lg:` layouts and the shell is capped at 560px (no master–detail, no two-pane review); U7-3 Space/P/Esc missing; U7-4 IPA hard-coded US-first, `english_variety` unused, and only one `audio_url` exists (UK/US audio needs a backend follow-up); U7-6 ~28 transitions without `motion-reduce:`, svg/label/reading-order/200% checks.
- No code changed, nothing committed, no deploy.
- Re-run (scheduled `dygo-ui7-u7-1`, 2026-10-03): U7-1 row already ✅ with the gap list in U7-2/3/4/6, so nothing redone; next step is U7-2.

### U7-2 (2026-10-03, automated pass) — ✅ `ccac6d4`
- New `ipad:` / `ipad-lg:` Tailwind variants apply only under `data-garden-ipad`, which GardenRoot sets when `NEXT_PUBLIC_GARDEN_IPAD_NAV` is on. With the flag off, and below 600px either way, nothing changes, so the phone references are not affected.
- §10 layouts: Today 5/8 + 3/8, then hero + 6/12 rows in landscape; Review two panes in landscape; Mission complete 2 columns in landscape; Weekly harvest 2 then 3 columns; Welcome back max 640; Topics 2-column grid; Topic bed with rail/sidebar and a 2-column word list; Me 2 columns. The column makes room for the 80px rail / 240px sidebar.
- Master–detail at `lg`: the sidebar lists the beds (Topics, bed) and the shared gardens (Groups, group garden). The lists only fetch at ≥1024px.
- `NEXT_PUBLIC_GARDEN_IPAD_NAV=true` added to `env-profiles/prod.env` (gitignored). **Dylan needs to deploy** before it shows.
- Checks: `tsc` and `next lint` on the touched files pass; `ipadNav.test` 8/8; all garden Vitest 290/290 in a clean HEAD copy. 17 existing tests fail in the working tree because of someone else's uncommitted `messages/*.json` copy edits. That's not this change; they need updating with those edits.
- Not done: the 260px landscape hero, the 26-week calendar and the bed table view. Not run: `next build`, Playwright, `garden:diff` and a real iPad.

### U7-3 (2026-10-03, automated pass) — ✅ `51b6180`
- New `useGardenShortcuts` hook (one window `keydown` map). It skips text fields, Alt/Ctrl/Cmd chords, held-down repeats, any open dialog or sheet, and Space on a focused button or link. `RatingBar`'s 1–4 now use it; the key hints and `aria-keyshortcuts` are kept.
- Review (`ReviewScreen`, which owns these controls; `ReviewLive` is unchanged): Space shows the answer, P plays the word (or retries the "unavailable" pill), and Esc leaves to the close link when no sheet is open. `aria-keyshortcuts` is set to `Space` on Show answer and `Escape` on Close. P has no `aria-keyshortcuts` because AudioButton wasn't touched. Shortcuts can be switched off with the new `keyboardShortcuts` prop.
- Checks: `tsc` passes and `next lint` on the touched files is clean. 6 new Vitest keyboard tests pass. All garden Vitest passes 296/296 in a clean HEAD copy. In the working tree, 5 existing tests still fail on someone else's uncommitted `en-US.json` copy edits (not this change).
- Not run: `next build`, Playwright, a real iPad keyboard. No deploy.
