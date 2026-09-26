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
