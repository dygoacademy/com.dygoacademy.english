# A6 Topics: fixed filter groups + long names — implementation plan (for Claude Code)

Date: 2026-10-17 · Owner: Dylan · Design: canvas page "Adult · Topics", boards `AdultTopics(Vi)` (**A6**, redrawn 2026-10-17)
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-17 — A6 Topics: fixed filter groups, long names" (*Approved*).
Dylan's rule: keep Dygo simple and clear.

## Problem today

- `topicFilters()` (`components/garden/live/data.ts`) makes **one chip per library collection** (`library:<collection_title>`, the public group's name) plus Mine. More collections → more chips, and long collection names. The row is `flex gap-2 px-4` with no scroll, so chips squash or spill off screen.
- Bed cards are a fixed 76 px with a one-line title, so a long name pushes the due badge or gets cut badly.

## New behaviour

### 1 · Fixed filter groups (in this order)

| id | EN | VI | What's in it |
|---|---|---|---|
| `all` | All | Tất cả | every bed (always shown) |
| `mine` | Mine | Của tôi | beds the learner created (`kind = 'mine'`) |
| `academic` | Academic | Học thuật | library beds on the IELTS Academic shelf |
| `general` | General | Tổng quát | library beds on the IELTS General shelf |
| `work` | Work | Công việc | library beds on the Work shelf |
| `travel` | Travel | Du lịch | library beds on the Travel shelf |
| `shared` | Shared | Nhóm | beds from the learner's groups (`kind = 'group'`) |

- A chip shows only if at least one bed is in it (`all` always). Chips never come from collection names again.
- A library bed whose collection has no shelf shows under **All** only.
- ZH: write to match. Keys under `screens.topics.filters.*`; remove the old `library:` labels path.

### 2 · Backend: a shelf for library collections

- Migration: `groups.library_shelf text null check (library_shelf in ('academic','general','work','travel'))`. Only meaningful for public library groups.
- Set it for the existing public library collections (list them with a query first; IELTS Academic → `academic`, IELTS General → `general`, Work & careers → `work`, Travel → `travel`). If a collection doesn't clearly fit (e.g. Everyday life), leave it null and add a line to `docs/design/QUESTIONS.md` for Dylan; don't guess.
- `GET /topics` (`topics.service.ts`): add `filter_group` = `'mine'` | `'shared'` | the collection's `library_shelf` | `null`, using the same `kind` logic as today (`mine` → `mine`, `group` → `shared`, `library` → `g.library_shelf`). Keep `kind` and `collection_title` as they are (other screens use them).
- Backend jest: each kind maps right; null shelf → null.

### 3 · Frontend

- `data.ts`: `toScreenTopic` sets `group` from `filter_group` (fallback: `kind === 'mine'` → `mine`, `kind === 'group'` → `shared`, else `null`). Replace `topicFilters()` with a fixed ordered list filtered to groups that have beds. The locked seed pack keeps its `groups` (it belongs to `academic`).
- `TopicsScreen.tsx` chip row = a **sideways slider** when the chips don't fit:
  - Outer `relative`; inner `flex gap-2 overflow-x-auto px-4 scroll-px-4` with the scrollbar hidden (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`), never wraps. Keep `role="group"` + `aria-label`; chips stay buttons with `aria-pressed`.
  - Chip: 38 px tall, `px-3` (12 px), 14 px / 600, `whitespace-nowrap`, `shrink-0`, `max-w-[200px]` + ellipsis (`title` = full label).
  - Edge fades: 28–36 px cream gradient (`#F4F1EA`) on the right when there's more to the right, on the left once scrolled (`pointer-events-none`). Compute from `scrollLeft` / `scrollWidth` on scroll and resize.
  - Selecting a chip scrolls it into view, centred (`scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced-motion ? 'auto' : 'smooth' })`). Also on first render if the initial filter isn't visible.
- **Bed card** (A6 and the topic cards in A6b search, same component if shared):
  - `min-h-[76px]` instead of `h-[76px]`, `py-2.5`; header row `items-start`.
  - Title: 16 px / 700, `leading-[1.25]`, 2-line clamp (`line-clamp-2`), `break-words`, `min-w-0`; `title` attribute = full name.
  - Due pill / "All watered": `shrink-0 whitespace-nowrap`, stays top-right.
  - Meta line: one line, `truncate`.
- The list area scrolls under the header; the tab bar never moves (check the screen's flex: list `flex-1 min-h-0 overflow-y-auto`).
- iPad (iA6): same filter groups and card rules; the chip row usually fits, the slider is just the fallback.

### 4 · References and tests

- References (already in `docs/design/garden/reference/`, jobs in `tools/render.js`): `A6-topics` and `A6-topics-vi` are **updated** (6 long-named beds, 7 chips), `A6-topics-filter-travel` and `A6-topics-filter-shared-vi` are **new** (filter picked, row scrolled so the chip is centred). Update the `A6-topics(-vi)` reference page in `(garden-reference)/garden/_reference/[name]` to the board's demo data (the 6 beds and their groups), add the two filter pages (pin the filter and the scroll position), add the two new names to `NAMES` in `scripts/garden-diff.mjs`; `npm run garden:diff -- --only A6-topics` ≤ 0.5 % EN + VI.
- vitest:
  - filters: fixed order; hidden when empty; `all` always; no chip from a collection name;
  - `toScreenTopic`: `filter_group` mapping + fallbacks;
  - chip row: no wrap; selecting a chip calls `scrollIntoView` with `inline: 'center'`; fades appear/disappear with scroll position (mock sizes);
  - card: long title gets the clamp class and `title`; due pill still rendered;
  - existing A6 / A6b tests keep passing.
- `tsc --noEmit`, lint, backend jest.

### 5 · Done when

- `Change Log.md`; set the 2026-10-17 A6 changelog entry and A6's row to **Built** with the commit.
- By hand on iPhone width (and the smallest supported, 360 px) in EN, VI, ZH: 7 chips slide, fades right, selecting Shared scrolls it into view; a 60-character bed name wraps to 2 lines with "…" and the badge stays put.
- Deploy UAT via `deploy/request.md`.
- One commit for backend + frontend, after a "Design" commit for the files already in the working tree (`source/AdultTopics(Vi).dc.html`, the A6 references, the render.js jobs, the CHANGELOG entry and this plan).

Out of scope: renaming collections, sorting beds, more than these 7 groups, iPad-only layouts.
