# A5 Welcome back — implementation plan (for Claude Code)

Date: 2026-10-10 · Owner: Dylan · Design: canvas page "Adult · Garden" (A5 `AdultComeback`, A5b `AdultComebackStart`, EN + VI)
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-10 — A5 Welcome back: finish it (A5b + rules)".

> **Gate:** A5b and the two rules below are **For approval**. Build only after Dylan marks them **Approved** in the changelog (rule 1 of that file).

## 1. What's wrong today (UAT, 2026-10-10)

Screen: `/garden` after 2+ missed days → `HomeLive` renders `WelcomeBackScreen` (A5).

| # | Problem | Where |
|---|---|---|
| P1 | 0 wilting words (the normal case) → `revive` is `null`, so the "Start small" card shows only an underlined "Water all 45" link in an empty white card. No title, no main button. | `WelcomeBackScreen.tsx` (card), `HomeLive.tsx` (`revive` only when `leech_count > 0`) |
| P2 | Missed 2+ days but nothing due and nothing wilting → A5 shows with no card at all (dead end). | `HomeLive.tsx` (`missed >= 2` is the only condition) |
| P3 | No time estimate: `revive.minutes` is always `null`, so "about 5 min" from the board never shows. | `HomeLive.tsx` |
| P4 | No way to water a *small batch*: `/review` always loads up to 20 due words; there is no "first N" session. | `src/app/(garden)/review/page.tsx`, `ReviewLive.tsx` |

Already fine, keep: header + date, comeback garden card (rain cloud, legend), "streak is safe" card (only when freezes covered days — `freezeStreak`), Quick revive → leech drill when there are wilting words, "Water all N instead".

## 2. Target behaviour

Show A5 only when **missed ≥ 2 days AND (`due_now` > 0 OR `leech_count` > 0)**. Otherwise render Today's Garden (A1, or A1b when it exists).

The "Start small" card, by case:

| Case | Overline | Title | Main button (two lines) | Link under it |
|---|---|---|---|---|
| A · wilting > 0 (A5, unchanged) | Start small | Start with the {w} wilting words | Quick revive · {w} words · about {m} min → leech drill (current href) | Water all {due} words instead → `/review` (only if due > 0) |
| B · wilting = 0, due > 10 (**A5b**) | Start small | Water the 10 thirstiest words first | Quick start · 10 words · about 4 min → `/review?limit=10` | Water all {due} instead → `/review` |
| C · wilting = 0, 1 ≤ due ≤ 10 (**A5b short**) | Start small | Water your {due} thirsty words | Start watering · {due} words · about {m} min → `/review` | none |

- Minutes: `minutesFor(count) = Math.max(1, Math.round(count * 25 / 60))` in `live/data.ts`, with a unit test — matches the boards: 12 → 5, 10 → 4, 6 → 3, 1 → 1.
- "10" is a constant `COMEBACK_BATCH = 10` in `live/data.ts`.
- `/review?limit=N`: the N most overdue due words. The backend already orders due words by `next_due_at asc` (`SrsService.findDue`) and accepts `limit` (1–100) on `POST /srs/sessions`, so this is frontend only.

## 3. Steps

1. **Data / rules** — `src/components/garden/live/data.ts`
   - `COMEBACK_BATCH = 10`, `minutesFor(count)`.
   - `comebackStart(s: SrsStats): WelcomeBackScreenProps['start']` returning case A / B / C (or `null`).
   - `showWelcomeBack(missed, s)` = `missed !== null && missed >= 2 && (s.due_now > 0 || s.leech_count > 0)`.
   - Tests in `data.test.ts` for all three cases, the boundary 10 / 11, and `minutesFor` (1, 6, 10, 12).
2. **Routes** — `src/constants/garden.ts`: `reviewFirst: (n) => \`/review?limit=${n}\``.
   `src/app/(garden)/review/page.tsx`: read `limit` (clamp 1–20), pass `limit` to `ReviewLive`; key the component on it too. `ReviewLive`: `useStudySession(topicId, 'STANDARD', limit ?? 20, planting)`. `new` wins if both are given.
3. **Screen** — `WelcomeBackScreen.tsx`
   - Replace the `revive` / `waterAll` props with one `start` prop: `{ kind: 'revive' | 'batch' | 'all'; count; minutes; href; waterAll: { count; href } | null }`.
   - Always render overline + title + body + primary two-line button (copy per case from the table); the link only when `waterAll` is set. The lone-link card can't happen any more.
   - Copy from the boards: `docs/design/garden/source/AdultComebackStart(Vi).dc.html`; reference PNGs `docs/design/garden/reference/A5b-welcome-back-start(-vi).png`.
4. **Live** — `HomeLive.tsx`: use `showWelcomeBack`; pass `start={comebackStart(s)}`.
5. **Messages** — `screens.comeback` in `messages/en-US.json`, `vi-VN.json`, `zh-CN.json` (write ZH to match):
   - `batchTitle` "Water the {count} thirstiest words first" / VI "Tưới {count} từ khát nhất trước"
   - `batchBody` "They’ve waited the longest. Do these ten and the rest can wait until tomorrow." / VI "Đây là những từ đã chờ lâu nhất. Xong 10 từ này, phần còn lại để mai cũng được."
   - `batch` "Quick start" / VI "Bắt đầu nhanh"
   - `allTitle` "Water your {count} thirsty words" / VI "Tưới {count} từ đang khát"
   - `allBody` "That’s all that’s waiting. A few minutes and your garden is back." / VI "Chỉ có chừng này đang chờ. Vài phút là vườn lại xanh."
   - `startWatering` "Start watering" / VI "Bắt đầu tưới"
   - reuse `reviveDetail` / `waterAllInstead`.
6. **Reference fixtures + diff**
   - `screens/fixtures.ts`: `COMEBACK_START` fixture (45 thirsty, 0 wilting, 31 ripe, streak 23 / 2 covered / 0 left).
   - `ReferenceScreen.tsx`: case `'A5b-welcome-back-start'`; add to the fixture list and to `scripts/garden-diff.mjs` `NAMES` (EN + `-vi`).
   - `docs/design/garden/tools/render.js`: jobs `['AdultComebackStart.dc.html','en','A5b-welcome-back-start',{}]` and the VI twin (the PNGs are already in `reference/`).
7. **Tests** — `screens.test.tsx`: A5 with wilting (unchanged), A5b batch (title, Quick start href `/review?limit=10`, "Water all 45 instead"), A5b short (no second link), and `HomeLive`: missed 3 days + nothing due → Today's Garden. Run `vitest src/components/garden` and compare against HEAD (about 44 tests already fail there from the copy rewrite `0f9c2a1`; count only new failures).
8. **Check** — `npm run garden:diff -- --only A5-welcome-back,A5b-welcome-back-start` (≤ 0.5 %), then by hand on UAT with a test account (set `last_reviewed_at` back 3 days).
9. **Wrap up** — `Change Log.md` entry; in `docs/design/garden/CHANGELOG.md` set A5b to **Built** with the commit and add a §3 line; deploy UAT via `deploy/request.md`.

## 4. Out of scope

- iPad iA5 (behind `NEXT_PUBLIC_GARDEN_IPAD_NAV`, off on UAT).
- A broken streak (no freeze left): no card today, design has none — ask Dylan before adding one.
- A1b "All watered" (separate, For approval).
