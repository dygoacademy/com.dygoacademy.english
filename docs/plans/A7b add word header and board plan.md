# A7b Add word: title + ✕ always visible, match the board — implementation plan (for Claude Code)

Date: 2026-10-17 · Owner: Dylan · Design: canvas page "Adult · Topics", boards `AdultAddWord(Vi)` (**A7b**), now also in `docs/design/garden/source/` (closes Q-19)
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-17 — A7b Add word: header + board" (*Approved*).

## The bug Dylan sees

On the phone the Add word sheet shows **no title and no ✕**. In code (`AddWordSheet.tsx` → `BottomSheet.tsx`) both exist (`DialogPrimitive.Title`, `closeButton` default on), so they are being pushed off screen. Most likely cause: the word field has `autoFocus`; on iPhone the keyboard opens while the sheet slides in, iOS scrolls the visual viewport to keep the field visible, and the sheet's top (grabber, title, ✕) ends up above the visible area. `max-h-[90dvh]` doesn't help because `dvh` ignores the keyboard.

**Reproduce first** on a real iPhone (Safari + the installed home-screen app) and an Android phone on UAT: Topic bed → + . Confirm the header is visible when the keyboard is closed and hidden when it's open. If it's hidden even without the keyboard, find that cause instead and say so in `QUESTIONS.md`.

## 1 · Keep the sheet header on screen with the keyboard open (fix in `BottomSheet`, all sheets)

- `src/app/layout.tsx` viewport: add `interactiveWidget: 'resizes-content'` (Android Chrome then shrinks the layout for the keyboard).
- New hook `useKeyboardInset()` (in `components/garden/`): listens to `window.visualViewport` `resize` + `scroll`; returns `inset = max(0, innerHeight - vv.height - vv.offsetTop)` and `vh = vv.height`. No `visualViewport` → `{ inset: 0, vh: innerHeight }`.
- `BottomSheet` (phone layout only, not `md:`): `style={{ bottom: inset, maxHeight: vh - 8 }}` while open (keep the drag `transform`). The header row is already `shrink-0`; the body scrolls (`overflow-y-auto`), so with the keyboard up the order is: grabber → title + ✕ → scrolling body → keyboard.
- **Focus after the slide-in, not during it:** remove `autoFocus` from the Add word input; focus it in `onOpenAutoFocus` of the dialog content after the open animation (`requestAnimationFrame` after `animationend`, or ~200 ms; immediately under reduced motion), with `preventScroll: true`. Apply the same pattern to any other sheet input that uses `autoFocus` (Create garden, Daily goal… grep).
- Tests: hook math with a mocked `visualViewport`; sheet style updates on viewport resize; focus moves to the field after open; Escape / ✕ still close and restore focus.

## 2 · Header as on the board

- Title **"Plant a new word"** / **"Gieo một từ mới"** (Fraunces 600, 22 px), subtitle **"Type a word you met today"** / **"Nhập một từ bạn gặp hôm nay"** (13 px, muted). ZH: write to match. The bed name is no longer in the header (it's in the "Plant it in" chips and the button). The **planted state keeps the same header** (no "Planted" title).
- ✕: 44 px white circle, 1 px `#E3DDD0` border, 20 px icon, `aria-label` close (as the board). If `IconButton` already looks like this, nothing to do; if not, give `BottomSheet` a `closeVariant="circle"` used by this sheet only (other sheets unchanged, their references must not move).
- Messages: `screens.bed.addSheet.title` / new `subtitle`; remove `description`, `descriptionMyWords`, `plantedTitle` if nothing else uses them.

## 3 · Body as on the board (now that it exists)

Copy sizes/colours from `source/AdultAddWord(Vi).dc.html`:
- **Field**: 52 px, radius 16, white, 2 px forest border, search icon left, 17 px text, `lang="en"`, `autoCapitalize="none"`. No separate "Word" label above (keep it as `aria-label`).
- **Word card** (white, 1 px border, radius 20, padding 14): word in Fraunces 600 28 px; under it "/IPA/ · part of speech" 14 px muted; level pill (`#DDE7DA` / forest, 12 px 700) and a 44 px forest **play** button on the right (plays the lookup's audio; hide the button if there is none). Meaning: EN 15 px / 600; VI board = Vietnamese meaning 16 px / 700 with the English definition under it 13 px muted (use the learner's meaning language as other screens do). **Example sentence** row (Fraunces 15 px, `#F7F4EC` box, the word in bold) only if the lookup returns one; never invent one.
- While looking up / not found: keep today's "Looking it up…" and "New to Dygo…" texts inside the same card.
- **"Plant it in"** label (12 px, 700, uppercase, tracking .08em) + bed chips (38 px, wrap, selected = forest) as today; "Already in {bed}." stays.
- **CTA**: clay button 56 px, radius 18, shadow `0 4px 0 #7E3719`, seed icon, **"Plant in {bed}"** / **"Gieo vào {bed}"**.
- **"Not the right meaning? Write your own"** link: only if a custom-meaning flow already exists; otherwise leave it out and add a line to `QUESTIONS.md` (don't build a new flow).
- **Planted state**: soil + sprout art (the board's `sink` animation, off under reduced motion), "Planted “{word}”" (Fraunces 24 px), "It's a seed in {bed}. First watering tomorrow." / VI from the board; two buttons **side by side**: "Plant another" (white, bordered) and "Done" (forest, shadow `0 4px 0 #142A21`).

## 4 · References and tests

- References are in `docs/design/garden/reference/`: `A7b-add-word`, `A7b-add-word-planted` (+ `-vi`); jobs in `tools/render.js`. Add reference pages in `(garden-reference)/garden/_reference/[name]` (sheet open over a plain bed background, word "resilient", bed Environment) and the names to `garden-diff.mjs`. The board's background is a placeholder, so compare the **sheet area**; if `garden-diff` can't clip, record the % and check the sheet by eye.
- vitest: header (title, subtitle, ✕) rendered in both states; ✕ closes; CTA label follows the chosen bed; example row hidden without data; play hidden without audio; planted buttons side by side.
- `tsc --noEmit`, lint.

## 5 · Done when

- On a real iPhone and Android on UAT: open Add word → keyboard up → **title and ✕ visible**, field visible, the rest scrolls; type "resilient" → card; Plant → planted state with the same header; ✕ closes from both states.
- `Change Log.md`; A7b row + the 2026-10-17 entry set to **Built**; Q-19 marked resolved. Deploy UAT via `deploy/request.md`.
- One commit, after a "Design" commit for the files already in the working tree (`source/AdultAddWord(Vi).dc.html`, the A7b references, the render.js jobs, the CHANGELOG entry and this plan).
