# 🛠️ Dygo Academy — Phase 3 Implementation Plan (Developer Handoff)
**Document Version**: 1.0
**Author**: Engineering planning pass, grounded in the actual backend/frontend source
**Status**: Ready for developer assignment — buildable modules only
**Reads with**: `phase 3.md` (the 7 modules — what and why). This document only covers what `phase 3.md` marked **Core** or **Standalone**; it deliberately excludes Module 20 (band score) and Module 23 (cohort momentum), both flagged Exploratory there, and FR-17.1 (diagnostic starter deck), which has an open content-sourcing question. Don't build those from this document — there's nothing here to build them from yet.

> **Hard gate, repeated from `phase 3.md` §1**: Module 21 and Module 22 restyle/extend the two screens Phase 2 shipped but that `phase 2.md` §9 found are **not yet deployed** (FR-13.1, FR-14.1). Confirm that deploy landed — reload `dygoacademy.com`, check a topic delete shows a styled dialog, not `window.confirm` — before starting either module below. Modules 18 and 19 don't touch those screens and aren't blocked.

---

## 1. What's in this plan

| Module | Covers | Blocked on |
| :--- | :--- | :--- |
| 17 (partial) | FR-17.2 only (arrival promise copy) | Nothing — ships anytime |
| 19 | FR-19.1 (per-topic mastery rings) | Nothing |
| 18 | FR-18.1 (Home as a walkable path) | Nothing (but sequence backend-then-frontend within it) |
| 21 | FR-21.1 (reward-framed session summary) | Phase 2's deploy (see gate above) |
| 22 | FR-22.1 (personal Focus List) | Phase 2's deploy (see gate above) |

Before starting: `cd com.dygoacademy.backend && npm test && npm run lint` and `cd com.dygoacademy.frontend && npx tsc --noEmit && npm run lint`, both clean.

---

## 2. FR-17.2 — Arrival promise copy

**Files**: `com.dygoacademy.frontend/src/app/search/page.tsx`, `com.dygoacademy.frontend/src/components/onboarding/GuestWordTrial.tsx`.
**Now**: `GuestWordTrial` is framed entirely around "try one word before signing up" — no outcome-oriented promise (band score, exam relevance) anywhere on the anonymous landing surface.
**Do**: add a headline/subhead above or around the existing trial card naming the outcome (e.g., "Learn the words that move your IELTS score"). Copy-only — do not touch the lookup logic itself.
**Est.**: 1–2h, mostly copywriting iteration, not engineering.
**Tests**: `tsc --noEmit`/lint only; no logic changed.

---

## 3. Module 19 — Per-topic mastery rings

### Backend: extend the topics list query
**Files**: `com.dygoacademy.backend/src/modules/topics/topics.service.ts` (`TopicSummary` interface, `findAllVisible`).
**Now**:
```ts
export interface TopicSummary {
  id: string; group_id: string; title: string; description: string | null;
  is_public: boolean; word_count: string; created_at: Date;
}
// findAllVisible:
select t.id, t.group_id, t.title, t.description, t.is_public,
       count(tw.id) as word_count, t.created_at
  from public.topics t
  left join public.topic_words tw on tw.topic_id = t.id
 group by t.id
 order by t.created_at desc
```
**Do**:
1. Add `mastered_count: string` to `TopicSummary` (Postgres `count()` comes back as a string — matches `word_count`'s existing type, don't introduce an inconsistent `number` field).
2. Extend the query with a second left join to `user_word_srs`, counting rows past the same mastery threshold `computeSrsSummary` already uses (`repetitions >= 4`) — reuse that literal, don't invent a second one:
```sql
select t.id, t.group_id, t.title, t.description, t.is_public,
       count(distinct tw.id) as word_count,
       count(distinct uws.topic_word_id) filter (where uws.repetitions >= 4) as mastered_count,
       t.created_at
  from public.topics t
  left join public.topic_words tw on tw.topic_id = t.id
  left join public.user_word_srs uws on uws.topic_word_id = tw.id
 group by t.id
 order by t.created_at desc
```
   `distinct` on both counts because the two-way join can multiply rows if a topic word has an SRS row (1:1 in practice, but don't rely on that going forward without the safeguard). No explicit `user_id` filter needed — `queryAs` runs this RLS-scoped, and `user_word_srs_all_own` already narrows the second join to the caller's own rows, same pattern `TopicsService`'s own comment already documents for why there's no tenant/membership WHERE clause here either.
3. No new route — this is the existing `GET /topics` response shape, just wider.

**Tests**: extend `com.dygoacademy.backend/src/modules/topics/topics.service.spec.ts`'s existing `findAllVisible` coverage with a fixture that has both mastered and unmastered words, asserting `mastered_count` reflects only the `repetitions >= 4` ones.

### Frontend: render the ring
**Files**: `com.dygoacademy.frontend/src/types/topic.ts` (`TopicSummary`), `com.dygoacademy.frontend/src/components/topics/TopicCard.tsx` (Home's list), `com.dygoacademy.frontend/src/components/topics/TopicGridCard.tsx` (Topics grid — its own comment literally says *"per-topic SRS data (GET /srs/due, Phase 2) we don't have yet"*, which the backend step above now closes).
**Do**:
1. Add `mastered_count: string` to the frontend `TopicSummary` type, matching the backend response.
2. In both `TopicCard.tsx` and `TopicGridCard.tsx`, add a small ring/percentage indicator. No existing ring component in this codebase to reuse (checked) — a plain `conic-gradient` circle sized ~28-32px is enough, no chart library needed: `background: conic-gradient(var(--primary) <pct>turn, var(--muted) 0)` inside a small rounded div, same technique the "Dygo Learning Path" concept artifact already used for its collection cards.
3. Compute `Number(topic.mastered_count) / Number(topic.word_count)` client-side; guard divide-by-zero for a topic with 0 words (render 0%, not `NaN`).
4. Keep `TopicGridCard`'s existing "public" chip and layout — the ring is additive, not a replacement of anything currently shown.

**Est.**: 0.5 day (backend query + test: 2–3h; frontend ring in two components: 2–3h).

---

## 4. Module 18 — Home as a walkable path

### Backend: daily activity aggregate
**Files**: `com.dygoacademy.backend/src/modules/srs/srs.service.ts` (new method, alongside `computeSrsSummary`), `com.dygoacademy.backend/src/modules/srs/srs.controller.ts` (new route).
**Now**: `computeSrsSummary`'s streak calculation already reads `review_logs` for `distinct (reviewed_at at time zone 'utc')::date::text`, but only as a flat list of dates for streak math — nothing aggregates *counts* per day, and nothing is exposed as its own endpoint.
**Do**:
1. New method, e.g. `getDailyActivity(userId, days = 7)`:
```sql
select (reviewed_at at time zone 'utc')::date::text as review_date, count(*) as reviews
  from public.review_logs
 where user_id = $1
   and reviewed_at >= now() - ($2 || ' days')::interval
 group by review_date
 order by review_date desc
```
   RLS-scoped via `queryAs`, same as every other `SrsService` read. Return shape: `{ date: string; reviewCount: number }[]`.
2. New route `GET /srs/activity?days=7` on `SrsController`, delegating straight to this method — no new DTO needed beyond an optional query param.
3. Days with zero activity simply won't appear in the result — the frontend fills gaps (step below), don't pad server-side.

**Tests**: new `describe` block in `srs.service.spec.ts` (fixture rows across a few days, assert grouping/counts); a route-level test in whatever pattern the existing `srs.controller` tests (if any) already use, or a service-level test only if the controller has no test file — check before assuming.

### Frontend: the path visualization
**Files**: `com.dygoacademy.frontend/src/app/(dashboard)/page.tsx` (Home), new hook `com.dygoacademy.frontend/src/hooks/useDailyActivity.ts`, likely a new component (e.g. `com.dygoacademy.frontend/src/components/topics/ActivityTrail.tsx` — don't overload `DueNowCard.tsx` with an unrelated visualization).
**Now**: Home's Due Now section is `<DueNowCard dueCount={stats.due_now} />` — a single number, no history.
**Do**:
1. `useDailyActivity(days = 5)` hook, same shape as `useSrsStats`/`useLeeches` (TanStack Query, `GET /srs/activity`).
2. New `ActivityTrail` component rendering the last 5 days as a simple horizontal sequence of nodes (done/today/upcoming states) — reuse the "Dygo Learning Path" concept artifact's node styling as a visual reference (conic-gradient rings, bubble states), not a literal copy-paste of its mockup markup, which was illustrative HTML, not production code.
3. Place it in `(dashboard)/page.tsx` above or alongside `DueNowCard`, not replacing it — the due-count card still answers "what do I do right now," the trail answers "how have I been doing."
4. Loading/error states matching the existing pattern already used for `stats`/`topics` on this page (skeleton pulse div, muted-foreground error text).

**Est.**: 1 day (backend: 2–3h incl. tests; frontend: 4–5h incl. a new component, states, and placement).

---

## 5. Module 21 — Reward-framed session summary
**Gate**: confirm Phase 2's deploy first (see top of this document).
**Files**: `com.dygoacademy.frontend/src/app/(dashboard)/study/page.tsx` (the `done` block FR-13.1 already built — `tally.knew`/`tally.missed`, the "Quiz this topic" CTA).
**Now**: plain text — `"{tally.knew} knew it · {tally.missed} didn't know — N cards this session."`
**Do**: restyle this block using the Learning Path concept's reward-hero treatment (celebratory framing, a streak callout if `useSrsStats()`'s `current_streak_days` is easy to thread in here, stat chips for knew/mastered) — **the underlying data (`tally`, `topicId`-gated CTA) does not change**, this is a presentation-layer change on top of FR-13.1's already-correct logic. Don't add a mastery claim ("+N words moved to solid") unless you can compute it from data already on this page — check what `useRateWord`'s response or `card.repetitions` before/after actually gives you before promising a number the page can't back up.
**Est.**: 0.5 day, all frontend, no new data dependency unless the streak-callout addition is included (in which case add a `useSrsStats()` call to this page, which doesn't currently import it).
**Tests**: `tsc`/lint only; visually confirm on a live account with a mixed-rating session.

---

## 6. Module 22 — Personal Focus List
**Gate**: confirm Phase 2's deploy first (see top of this document).
**Files**: `com.dygoacademy.frontend/src/app/(dashboard)/analytics/page.tsx` (new section, alongside the existing per-group `GroupHeatmapSection`), reuses `useLeeches()` (already live, already used on this same page's stat tiles).
**Now**: this page's only "what's wrong" list is `GroupHeatmapSection` — admin-only, group-scoped (`GET /groups/:id/heatmap`, gated by `canManage`). A non-admin student has no equivalent view of their own trouble words as a ranked list.
**Do**:
1. New component, e.g. `PersonalFocusList`, rendered once near the top of `AnalyticsPage` (above the per-group sections, since it's the one relevant to every user regardless of admin status).
2. Data: `useLeeches()` — already returns `LeechCard[]` (`topic_word_id`, `topic_id`, `source_word`, `recent_mistakes`, `total_mistakes`, `next_due_at`). No backend change needed.
3. Reuse FR-14.1's `heatmapPillClass`-style bucketing (`com.dygoacademy.frontend/src/app/(dashboard)/analytics/page.tsx` already has a `heatmapPillClass(rate: number)` helper) for visual consistency — but `LeechCard` has no `failure_rate` field, so bucket by `recent_mistakes` count instead (e.g. 4-5 mistakes = low bucket, 6-7 = mid, 8+ = high — pick thresholds that make sense against `LEECH_THRESHOLD`'s value in `srs-algorithm.ts`, don't guess it independently).
4. Empty state: "No focus words right now" when `leeches?.length === 0` — mirrors the tone of FR-14.1's own empty-state copy ("No mistakes to review — nice work"), don't duplicate the exact string, differentiate personal vs. group framing.

**Est.**: 0.5 day, frontend-only.
**Tests**: no existing test runner for this component (consistent with the rest of this page); manual verification on a live account with real leech words.

---

## 7. Definition of done

- Each module's `tsc --noEmit`/`eslint`/`jest` clean before commit, same as every Phase 2 session.
- Module 19's backend change gets a real regression test (mastery count from fixture data) — this is new scope, not a restyle, so it doesn't get to skip test coverage the way Module 21/22's pure-CSS changes reasonably can.
- Modules 21/22 are verified against a **live account**, not just code review, given `phase 2.md` §9's finding that "clean code review" and "actually deployed" are not the same thing in this environment. Re-confirm the deploy gate at the *end* of these sessions too, not just the start — if a redeploy happened mid-session, verify against the version that's live *now*.
- `phase 3.md`'s own traceability (add one if a session schedule doc tracks it, matching Phase 2's convention) updated as each module lands.
