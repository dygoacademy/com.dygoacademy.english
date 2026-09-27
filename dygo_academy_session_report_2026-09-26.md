# Dygo Academy — session report, 2026-09-26

## Pass 1: Phase 12 UI-2 components (automated, 2026-09-25 22:22 UTC)

**Run**: scheduled task "Dygo Phase 12: continue UI-2 components", no user present.
**Plan followed**: `phase 12 implementation plan.md` §1, §4, §5 (UI-2) and §10 (rules for automated passes).
**Result**: every UI-2 component is built, in `/garden/_gallery` in every state, with a Vitest runner and 131 passing tests. Stopped at gate G1; UI-3 not started. Classic UI unchanged.

### Commits (frontend only; nothing in the backend or `database/`)

| Commit | Part | What |
| --- | --- | --- |
| `f06702b` | UI-2 (part 2) | `PlantGlyph`, `stageFromSrs`, `RatingBar`, shared icons, garden keyframes, Vitest + Testing Library + jsdom, first tests |
| `6ed48f0` | UI-2 (part 3) | Garden `AudioButton`, `ReviewCard` |
| `7a8be4e` | UI-2 (part 4) | `MissionRow`, `HeroGardenCard`, `StageTile`, `WordRow`, `--color-forest-muted` token; Prettier on the UI-2 files |
| `1063de0` | UI-2 (part 5) | `BottomTabBar`, `BottomSheet`, `Toast`; `Button` made a client component (fix); 44px hit areas on `Chip` / `Switch` |

Each commit staged exact paths only. `git status` showed 111 entries before and after the pass (the other work in the tree was not touched). Not committed on purpose: `phase 12 implementation plan.md` (it's untracked, so the whole file is uncommitted and not mine to commit), `dygo_academy_master_project_schedule.md` (has your own edits; changelog line 5.50 added). This report is committed on its own as a `docs:` commit.

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

Scheduled task "UI-L — the app in three languages", continued by Dylan after the repo folder was connected. Spec: `phase 12 implementation plan.md` → UI-L. UI-G was not started. One interruption: the connection dropped during part 3 and the pass resumed from the same state.

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
- `dygo_academy_api_surface.md` has other people's uncommitted edits: only the new row was committed (staged as HEAD + that row); the working copy keeps both.
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

Scheduled task "UI-G — Groups". UI-L was already finished (last commit `a64d74f` at 12:03, no unreported work under the garden or message folders), so the pass went straight to UI-G. Spec: `phase 12 implementation plan.md` → UI-G, decisions 9–11, §10. One interruption: the link to the Mac dropped during part 4 and the pass resumed from the same state when Dylan asked it to continue.

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

- **`dygo_academy_api_surface.md` was briefly emptied by this pass and restored.** A script wrote the file before reading it. The pass restored it from git's object store (the uncommitted version from 25 Sep 14:06, blob `9ee0042`) plus the UI-L `PATCH /profiles/me` row; `git diff --stat` against HEAD is again exactly the 10 insertions / 5 deletions it showed at the start of the pass. Please skim that file's uncommitted diff once to confirm nothing newer than 25 Sep 14:06 was in it. The four new rows were committed as HEAD + rows; the working copy keeps both.
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

- **U5-1** `6e86063`: `GET /topics/:id` words now carry the caller's own `fsrs_state`, `mastered_at`, `is_leech`, `next_due_at` (left join to `user_word_srs` on `topic_word_id` and `user_id = caller`, on top of the owner-only RLS policy; all null when never studied). `TopicWordRow` type extended; API surface row updated. Files: `topics.service.ts`, `topics.service.spec.ts`, `dygo_academy_api_surface.md`.
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
