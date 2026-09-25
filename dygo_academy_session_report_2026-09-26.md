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

Each commit staged exact paths only. `git status` showed 111 entries before and after the pass (the other work in the tree was not touched). Not committed on purpose: `phase 12 implementation plan.md` (it's untracked, so the whole file is uncommitted and not mine to commit), `dygo_academy_master_project_schedule.md` (has your own edits; changelog line 5.50 added), and this report (committed separately if the lock allowed; see the last line).

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
