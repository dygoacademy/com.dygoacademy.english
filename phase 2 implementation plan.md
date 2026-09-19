# 🛠️ Dygo Academy — Phase 2 Implementation Plan (Developer Handoff)
**Document Version**: 1.0
**Author**: Engineering planning pass, grounded in the actual backend/frontend source
**Status**: Ready for developer assignment
**Reads with**: `phase 2.md` (the business requirements — what and why) and `dygo_academy_tech_spec_and_conventions.md` (house coding conventions). This document is the *how*: real file paths, current behavior, and step-by-step approach for every FR in Phase 2.

> Every "current behavior" claim below was confirmed by reading the actual source on 2026-09-19, not inferred from the live app. Where that reading changed the diagnosis from what the original UX audit assumed, `phase 2.md` §7 has the full explanation — this document just states the corrected, code-grounded reality and moves straight to the fix.

---

## 1. How to use this document

Each ticket below maps 1:1 to an FR in `phase 2.md` §4. It gives you: the files to open, what's actually there today, a numbered approach, what to test, and an estimate. Acceptance criteria are **not repeated here** — check `phase 2.md` for the exact bar each FR has to clear; this document only adds the "how."

Before starting any ticket: `cd com.dygoacademy.backend && npm test && npm run lint` and `cd com.dygoacademy.frontend && npx tsc --noEmit && npm run lint`, both clean, so you know your baseline is green before you touch anything.

## 2. Suggested PR sequencing

Four PRs, in this order. Grouping follows "what touches the same file" and "what's safe to ship independently," not strictly the P0/P1/P2 order in `phase 2.md` — Wave 0 ships first because it's low-risk and fast, not because it's high priority.

| Wave | PR contents | Why this grouping | Est. |
| :--- | :--- | :--- | :--- |
| **0 — warm-up** | FR-15.2, FR-15.3, FR-15.4, FR-16.1, FR-16.2 | Copy + one CSS property + one nav-array edit. Zero behavioral risk, ships same day, builds momentum before the real work. | ~2h |
| **1 — P0, retention loop** | FR-9.1, FR-9.2, FR-9.3, FR-15.1 | Same file (`(dashboard)/page.tsx`) and same root cause (Home is a hardcoded stub) — one PR, one review. | 0.5–1 day |
| **2 — destructive actions** | FR-10.1, FR-10.2 (verify), FR-10.3, FR-11.1 (verify) | All "confirm before you destroy something" work; reuses one dialog pattern across three call sites. | 0.5 day |
| **3 — quiz & study UX** | FR-12.1, FR-12.2, FR-12.3, FR-13.1 | Same two pages (`quiz/page.tsx`, `study/page.tsx`), same session-state shape (track what happened this session). | 1–1.5 days |
| **4 — analytics** | FR-14.1 | Isolated to one component; no dependency on the others. Can run in parallel with Wave 3 if you have two people. | 0.5 day |

**Total: roughly 3–4 developer-days**, most of it in Waves 1 and 3.

---

## 3. Wave 0 — Copy & nav warm-up

### FR-16.1 — Sticky navigation header
**Files**: `com.dygoacademy.frontend/src/components/layout/Navbar.tsx`
**Now**: `<header className="flex flex-wrap items-center justify-center gap-4 border-b px-4 py-3 ...">` — no `sticky`/`fixed`, scrolls away with content.
**Do**: add `sticky top-0 z-10` plus an opaque background token (check `tailwind.config.ts` for the existing surface/background token rather than hardcoding a hex) to that className. Scroll-test the longest page in each section (topic detail with 20 words, group admin panel, full heatmap) to confirm nothing sits underneath the now-fixed header.
**Est.**: 15–30 min.

### FR-16.2 — Explicit Home nav entry
**Files**: same `Navbar.tsx`, the `NAV_LINKS` array (~lines 14–18).
**Now**: Topics/Groups/Progress only in the array; Profile is added separately; a code comment states Home was deliberately dropped in favor of the logo.
**Do**: add a "Home" entry pointing at `ROUTES.home`. Note in the PR description that this reverses that earlier comment's decision per the audit finding — so it reads as a deliberate change, not someone missing the comment.
**Est.**: 15 min.

### FR-15.2 — Topics-page copy
**Files**: search the frontend for the string `"Module 3"` (likely `src/app/(dashboard)/topics/page.tsx` or a shared copy constants file — wasn't pinned to an exact line during planning, grep first).
**Do**: replace `"Due counts per topic land with Module 3 — reviews are cross-topic in the meantime, see the Home tab."` with learner-facing language, e.g. *"Review counts are combined across all your topics for now — check Home for what's due."*
**Est.**: 10 min.

### FR-15.3 — Remove ticket reference from reminder copy
**Files**: `com.dygoacademy.frontend/src/components/settings/NotificationSettings.tsx`, line ~87–89.
**Now**: `"A nudge when cards are due — leech words and streak risk take priority over a plain reminder (FR-6.3/6.4)."`
**Do**: drop the parenthetical. The sentence stands fine without it.
**Est.**: 5 min.

### FR-15.4 — "used 1 times" grammar
**Files**: backend returns raw `use_count`/`max_uses` (`groups.service.ts`, `GroupInviteSummary`) with no formatted string — the text is built entirely on the frontend. Grep the groups-admin frontend (likely near `src/components/groups/`) for where `use_count` gets turned into display text.
**Do**: pluralize correctly (`used once` / `used N times`, N ≥ 2).
**Est.**: 10 min.

**Wave 0 tests**: `npx tsc --noEmit && npm run lint` on the frontend; no backend touched.

---

## 4. Wave 1 — Module 9 (Retention-Loop Data Integrity) + FR-15.1

This is the important one. **Corrected diagnosis** (see `phase 2.md` §7): Home's numbers aren't a backend divergence — they're literal hardcoded stub values that were never wired to the real endpoints the Progress page already uses correctly.

### FR-9.1, FR-9.2, FR-9.3 — Wire Home to real data
**Files**:
- Frontend: `src/app/(dashboard)/page.tsx`, `src/components/topics/DueNowCard.tsx`, `src/components/topics/LeechNudge.tsx`
- Reuse (already exist, already correct): `src/hooks/useSrsStats.ts`, `src/hooks/useLeeches.ts` — currently only called from `src/app/(dashboard)/analytics/page.tsx`
- Backend: `src/modules/srs/srs.service.ts` (`stats()`, `findLeeches()`, `computeStreak()`), `src/workers/notification.processor.ts` (`buildPayload()`)

**Now**:
```tsx
// (dashboard)/page.tsx — current stub
<span>12-day streak</span>                          // hardcoded
<DueNowCard dueCount={12} etaMinutes={4} />          // hardcoded props
<LeechNudge count={2} />                             // hardcoded, always renders
<Button variant="outline" disabled>+ Add a word · Phase 1</Button>  // dead control, FR-15.1
```
`SrsService.stats()` and `findLeeches()` are real, RLS-scoped, and already correct — Progress already calls them via `useSrsStats()`/`useLeeches()`.

**Approach**:
1. In `page.tsx`, call `useSrsStats()` and `useLeeches()` (same as `analytics/page.tsx`). Pass `stats.current_streak_days`, `stats.due_now`, `stats.mastered_words` through to the streak pill and `DueNowCard` instead of literals.
2. Pass `leeches.length` (or `stats.leech_count`) into `LeechNudge`, and only render `LeechNudge` when that count is `> 0`.
3. `LeechNudge`'s "Fix →" link should route to the same leeches list the Progress page's leech section reads from, so it can never again point at a different query than the count it displays.
4. **FR-15.1, same PR**: either wire the "+ Add a word" button to the existing add-word flow already live on the topic detail page, or delete it from Home entirely until it's wired. Also strip "· Phase 1" from the label regardless of which you choose — that's internal build language either way.

**Then, the deeper fix** (recommended, not strictly required to close the visible bug, but closes the actual "one source of truth" gap Module 9 is named for):

5. In `srs.service.ts`, extract the streak/due-count/leech-count computation from `stats()` into a standalone exported function — something like `computeSrsSummary(queryFn, userId)` — parameterized over how it queries (so the RLS-scoped `queryAs` path and the worker's batch path can both call it without duplicating SQL).
6. In `notification.processor.ts`, replace `buildPayload()`'s hand-written duplicate query with a call to that same function. It currently runs on the unscoped `authenticator` role with an explicit `user_id` param (appropriate for a batch cron context iterating many users — don't force it onto the RLS-scoped per-request path) — just stop it from being a *second, independently maintained copy* of the same SQL.

**Tests**:
- Extend `src/modules/srs/srs.service.spec.ts` (existing streak/due/leech `describe` blocks) to cover the extracted function directly.
- Extend `src/workers/notification.processor.spec.ts` to assert its output now comes from the shared function — a fixture user with known streak/due/leech state should produce identical numbers whether read via `GET /srs/stats` or via the worker's payload builder. This is the regression test that would have caught the original bug pattern (not this specific bug, which was frontend-only, but the general "two authored copies" risk).
- Frontend has no test runner (confirmed in `dygo_academy_master_project_schedule.md`) — verify manually against a live account: open Home and Progress side-by-side, confirm identical streak/due numbers, and confirm the leech nudge either matches the leeches list or doesn't render.

**Est.**: 0.5–1 day (steps 1–4 are a few hours; steps 5–6 are the rest).

---

## 5. Wave 2 — Module 10 & 11 (Destructive actions, sharing defaults)

### FR-10.1 — Topic delete: upgrade to a styled, informative confirm
**Files**: `src/app/(dashboard)/topics/[topicId]/page.tsx` (`handleDelete`, ~lines 65–74). Pattern to reuse: `src/components/topics/WordStatusRow.tsx`'s `AlertDialog` (`@radix-ui/react-alert-dialog` is already a dependency).
**Now**: `handleDelete` calls plain `window.confirm(...)` — there *is* a confirmation step, it's just the unstyled browser dialog with no topic name or word count in it.
**Do**: replace with the same Radix `AlertDialog` pattern `WordStatusRow` uses, populated with the topic's title and word count (already available on the page — it's rendering the word list). If extracting a shared `ConfirmDeleteDialog` component is a quick lift, do it; if `WordStatusRow`'s dialog is tightly coupled to that row, don't force an abstraction for two call sites — duplicate the ~20 lines instead.
**Est.**: 2–3h.

### FR-10.2 — Word delete: verify, don't build
**Files**: `src/components/topics/WordStatusRow.tsx`.
**Now**: already uses a styled `AlertDialog` confirm (shipped 2026-09-18, per an in-code note — one day before the audit that flagged this). Delete only fires from the dialog's confirm action.
**Do**: verify against `phase 2.md`'s FR-10.2 acceptance criteria on a live account. If it passes, mark done in the traceability table with no code change. Only write code if verification finds a real gap.
**Est.**: 30 min (verification only).

### FR-10.3 — Separate "Delete group" from "Save changes"
**Files**: `src/components/groups/GroupSettingsPanel.tsx` (~lines 80–96).
**Now**: both buttons sit in one `<div className="flex gap-2">` — same row, same visual weight, `variant="destructive"` on delete is the only differentiator.
**Do**: move "Delete group" into its own section below a divider (a "Danger zone" block is a common, well-understood pattern for this). Add the same `AlertDialog` confirm pattern from FR-10.1, naming the group, its roster size, and topic count.
**Est.**: 2–3h.

### FR-11.1 — Group "Public" default: verify, don't build
**Files**: `src/components/groups/CreateGroupForm.tsx` (`isPublic` state), `001_initial_schema.sql` (`groups.is_public boolean not null default false`).
**Now**: both layers already default to private. The one public group seen live during the audit isn't in the tracked seed data (confirmed against `004_seed_data.sql`), so it was very likely a deliberate choice by whoever set up that test data.
**Do**: create a fresh group in the live app, confirm the checkbox renders unchecked. If confirmed, close with no code change — this FR was likely never a real bug in the create flow. Leave the existing public demo group alone unless Product answers `phase 2.md` §6 open question 2.
**Est.**: 15 min.

**Wave 2 tests**: `npm test` (backend, no logic changed but re-run to confirm no regression) + `npx tsc --noEmit && npm run lint` (frontend) + manual click-through of all four flows on a live account.

---

## 6. Wave 3 — Module 12 & 13 (Quiz & study session UX)

### FR-12.1 — Confirm or preserve progress on quiz exit
**Files**: `src/app/(dashboard)/quiz/page.tsx` — the × control is a plain `<Link href={ROUTES.home} aria-label="End quiz">✕</Link>` (~lines 129–131), no confirmation logic at all today.
**Do** (pick one, document the choice in the PR description — `phase 2.md` leaves this open):
- **Option A (confirm dialog)**: track whether ≥1 question has been answered (likely inferable from existing quiz state — check what `QuizScreen` already tracks for scoring). If 0 answered, let the × navigate immediately (no friction on an accidental instant exit). If ≥1 answered, show a confirm dialog before navigating.
- **Option B (resume)**: persist the current question index (query string or local storage keyed by `topicId`) and have the quiz entry point on the topic page detect an in-progress session and offer "Resume" vs. "Start over."
Option A is less work; Option B is the better experience. Pick based on remaining time in this wave.
**Est.**: 0.5 day.

### FR-12.2 — Show the chosen answer, not just the verdict
**Files**: `src/components/quiz/QuizQuestion.tsx` (option buttons, ~lines 134–148, currently call `onSubmit(option, false)` directly with no selected-state UI), `src/components/quiz/QuizFeedback.tsx`, `src/app/(dashboard)/quiz/page.tsx` (`handleSubmit`, the `result ? <QuizFeedback/> : <QuizQuestion/>` full swap at ~lines 140–144).
**Do**:
1. Add local `selectedOption` state in `QuizQuestion`, set on click before `onSubmit` fires.
2. Stop swapping straight to `QuizFeedback`. Either keep `QuizQuestion` mounted and pass `result` into it (so it can mark the selected option and, if wrong, the correct one, in place) before transitioning, or merge the two components into one that renders the option list with selection/correctness styling plus the explanation text inline below.
**Est.**: 0.5 day.

### FR-12.3 — Distinguish enabled from disabled Submit
**Files**: `src/components/quiz/QuizQuestion.tsx` (~lines 126–132, `disabled={disabled || !text.trim()}` with `disabled:opacity-50`).
**Do**: widen the visual gap between states — e.g. disabled keeps reduced opacity *and* switches to an outline/neutral fill; enabled is a full solid fill. One Tailwind class change.
**Est.**: 30 min–1h.

### FR-13.1 — Study session summary + next-step CTA
**Files**: `src/app/(dashboard)/study/page.tsx` — `handleRate` (~lines 115–119) currently fires the rating mutation and advances the index but never tallies the result; the completion screen (~lines 140–156) only shows a raw card count.
**Do**:
1. Add a tally (e.g. `{ knew: number; missed: number }`) updated inside `handleRate`, mapping ratings to knew/missed — confirm against `RatingButtons.tsx`'s actual rating values (`AGAIN`/`HARD`/`GOOD`/`EASY`) rather than assuming a 2-way split; decide (and document) which ratings count as "knew."
2. Render both counts on the completion screen.
3. Add one primary CTA beyond "back to topics" — link to `/quiz?topicId=...` if the topic supports it, or the next topic with due cards.
4. Per `phase 2.md` §2.1 / open question 4: keep this plain and textual — don't adopt the "Learning Path" concept's reward-hero visual treatment here, that's separately-scoped Phase 3 work.
**Est.**: 0.5 day.

**Wave 3 tests**: no frontend test runner exists; rely on `tsc --noEmit`/lint plus a manual pass through a full quiz (mixed right/wrong answers, exit mid-quiz) and a full study session (mixed knew/missed ratings).

---

## 7. Wave 4 — Module 14 (Analytics heatmap)

### FR-14.1 — Filter to mistakes only, scale color by miss rate
**Files**: `src/app/(dashboard)/analytics/page.tsx` (`GroupHeatmapSection`, ~lines 123–163), `src/hooks/useGroupHeatmap.ts`.
**Now**: renders every word the hook returns with no filter, and every row uses the same fixed class (`border-destructive/40 bg-destructive/10 text-destructive`) regardless of `failure_rate` — only the percentage number changes.
**Do**:
1. Filter to `entry.failure_rate > 0` before rendering (no backend change needed — the data's already there per-word).
2. Replace the fixed class with 3–4 intensity buckets mapped from `failure_rate` (e.g. low/med/high opacity or color steps). A stepped scale is enough to satisfy "visibly different intensities" — don't build a continuous gradient system for this.
**Est.**: 3–5h.

**Tests**: no existing test file for this component; verify manually with a fixture group that has a mix of 0%, low, and high miss-rate words.

---

## 8. Definition of done (per wave)

- Backend: `npm test` and `npm run lint` clean in `com.dygoacademy.backend`.
- Frontend: `npx tsc --noEmit` and `npm run lint` clean in `com.dygoacademy.frontend`.
- Each FR's acceptance criteria in `phase 2.md` §4 checked against a live account — this repo's standing caveat (per `dygo_academy_master_project_schedule.md`) is that most prior work was verified only by static checks, never a live stack; don't repeat that gap here.
- `phase 2.md`'s traceability table (§5) updated with a ✅ and the PR link per FR as each wave lands.
- Anything that turns out to already be done (FR-10.2, FR-11.1) gets marked as such with a one-line note, not silently dropped.
