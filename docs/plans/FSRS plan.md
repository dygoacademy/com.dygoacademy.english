# Phase 10 Implementation Plan — FSRS Scheduler (Replaces SM-2)

Developer-facing companion to `docs/product/dygo_academy_master_project_schedule.md`'s Phase 10 section (the *why*: scope, blockers, sequencing). This file has the *how*: real files, real migrations, real signatures, real numbers. Same companion-plan convention `phase 9 implementation plan.md` uses: summarize it back into the master schedule and retire it once Phase 10 closes.

**Renumbering note (2026-09-25)**: the former Phase 10 (Locale, Timezone, Household Profiles & i18n) is now **Phase 11** — see `phase 11 implementation plan.md`. FSRS lands first because Phase 11's Workstream 2 rewrites RLS on `user_word_srs`/`review_logs`. Changing those tables' columns once, before that RLS rewrite, is cheaper than changing them on both sides of it.

**End state**: SM-2 is fully removed. `srs-algorithm.ts`, the ease factor, the fixed 1→3→7→16 ladder, the λ·M_recent penalty and the `ease_factor`/`interval_days`/`repetitions` columns are all gone. Every scheduling decision comes from FSRS (via `ts-fsrs`), fed by graded signals from **both** flashcards and quizzes.

---

## Build status (2026-09-25)

**Code complete for Workstreams 1–4 (step D is written but not run). Nothing is deployed, migrated or committed yet**: the local database is also production, so those steps wait for the owner's go-ahead.

| Workstream | Status |
|---|---|
| 1. Review-signal logging | ✅ `019_review_log_signals.sql`; every review writes `source`, `quiz_type`, `hint_used`, `graded`, `state_before`, `elapsed_days`, `scheduled_days`, `stability_after`, `difficulty_after` |
| 2. FSRS engine | ✅ `ts-fsrs` 5.4.2 (exact pin), `fsrs-config.ts`, `fsrs-scheduler.ts`, `020_fsrs_card_state.sql` (heuristic backfill + straggler catch-up), `scripts/backfill-fsrs.js` (history replay, dry-run by default), sticky `mastered_at` |
| 3. Grading policy | ✅ `grading.ts`, `SrsService.recordQuizResult`, `QuizService.answer` → SRS (never fatal), `AnswerResult.srs`, quiz feedback card shows "Mastered" / "will come back" |
| 4. Cutover / SM-2 removal | ✅ steps A–C in code (`srs-algorithm.ts` + spec deleted; SM-2 fields removed from DTOs, types, seeds, tests; BRD FR-3.1/3.2, API surface, dictionary, README updated). ⏳ Step D (`021_drop_sm2_columns.sql`, behind `--drop-sm2-only` with a typed confirmation) runs at least a week after live verification |
| 5. Parameter optimization | ⏳ Needs ~1,000+ graded reviews of data |

**Verified**: backend 217/217 jest (18 suites; was 190), `tsc --noEmit` clean on backend, frontend and automation suite, lint clean on changed files. On a throwaway Postgres 16 in the cloud workspace:
- the fresh-install chain (stub → 001–017 → 019/020 twice → 004 seed) applies cleanly;
- the RLS suite gives the **same result as the untouched pre-change files** (26 pass, plus the same pre-existing failure at line 207, `trg_group_owner_membership`; separately, 018's 4 public topics break section D's anonymous-topic count, also pre-existing);
- the upgrade path (old SM-2 seed → 019/020 → backfill) keeps every `next_due_at` and every grandfathered mastery;
- a row written by the old backend mid-upgrade is converted by re-running 020;
- after 021, the service's exact SQL runs with the SM-2 columns gone.

**Not verified**: a live run against the real stack (`next build`/`nest build` and pm2 restarts were deliberately not run, because production runs from those build outputs), and the live-stack automation suite.

**Deploy runbook**: see README → "Spaced repetition".

**Update (2026-09-25, later the same day): rollout switched to wipe-and-rebuild.** The owner chose to back up, delete and rebuild the database rather than upgrade it in place. Migrations 001–021 were squashed into `database/schema/` (FSRS native, no SM-2 columns at all) with seeds in `database/seeds/`, and `database/reset-db.sh` does backup → wipe → rebuild. That makes the upgrade-only pieces unnecessary: 019/020/021 and the `--fsrs-only`/`--drop-sm2-only` flags are archived in `database/archive/2026-09-25_pre_squash/`, and `scripts/backfill-fsrs.js` is deleted. Workstream 4 step D is effectively done: there are no SM-2 columns to drop. The upgrade-path notes below are kept as history. See `database/README.md`.

---

## 0. Why — what the 2026-09-25 SRS review found

Dygo's current scheduler is a modified SM-2, **not** FSRS (confirmed: no FSRS library in any `package.json`, no stability/difficulty columns anywhere). Reading `srs-algorithm.ts`, `srs.service.ts` and `quiz.service.ts` against the rules for combining flashcards and quizzes turned up these problems:

| # | Problem | Where | Impact |
|---|---|---|---|
| 1 | **HARD never grows past 1 day.** `round(max(interval,1) × 1.2)` = `round(1.2)` = 1, forever | `applyRating()` HARD branch | A word the child keeps finding hard is shown daily, indefinitely |
| 2 | **Four HARDs = "mastered".** HARD still increments `repetitions`; mastery is `repetitions >= 4` | `MASTERY_THRESHOLD`, `topics.service.ts`, `getTierProgress`, `computeSrsSummary`, `rate()`'s `just_mastered` | Inflates the tier ladder, collection rings and the "+N mastered" line |
| 3 | EASY on a new card = GOOD (`round(1 × 1.3)` = 1) | `applyRating()` EASY branch | EASY has no effect on first review |
| 4 | λ·M_recent penalty lowers EF even on *correct* answers for 7 days after a miss | `computeEaseFactor()` | A recovering learner is slowed down twice |
| 5 | Overdue reviews get no credit (next interval ignores actual elapsed time) | ladder uses scheduled, not actual, interval | Recalling a word 20 days late counts the same as on time |
| 6 | **Quiz answers never reach the SRS** — no `SrsService.rate()` call, no `review_logs` row | `QuizService.answer()` | The most objective signal in the app is thrown away, including wrong answers |
| 7 | Flashcard self-rating is the *only* grading signal | `study/page.tsx` → `POST /srs/rate` | Young children over-report "Knew it" |
| 8 | No "one graded review per word per day" guard; only the `findDue` queue prevents re-grading | `SrsService.rate()` | `sync()` replays or a future practice mode could grade a word several times a day |

FSRS fixes 1, 3, 4 and 5 by design. Workstream 3 below fixes 6, 7 and 8. Problem 2 is fixed by redefining mastery on FSRS stability (§2.6).

---

## Workstream 1 — Review-signal logging (ship first, independent)

FSRS's optimizer (and any honest before/after comparison) needs richer review history than `review_logs` stores today. Every week this is missing is training data lost, so it ships first, on its own, before any scheduling change.

### 1.1 Migration `019_review_log_signals.sql`

```sql
alter table public.review_logs
  add column source          text    not null default 'flashcard'
                             check (source in ('flashcard', 'quiz', 'leech_drill', 'sync')),
  add column quiz_type       text,            -- CLOZE | DICTATION | MATCHING | CONTEXTUAL_CHOICE; null for flashcards
  add column hint_used       boolean not null default false,
  add column graded          boolean not null default true,  -- false = logged but did not change the schedule
  add column state_before    text,            -- New | Learning | Review | Relearning (filled from Workstream 2 on)
  add column elapsed_days    real,            -- actual days since the previous graded review of this word
  add column scheduled_days  real,            -- interval that had been planned for this review
  add column stability_after real,            -- filled from Workstream 2 on
  add column difficulty_after real;           -- filled from Workstream 2 on

comment on column public.review_logs.graded is
  'false when this event was recorded for analytics only (e.g. a correct quiz answer '
  'on a word already graded today) and did not move user_word_srs.';
```

`review_logs` is range-partitioned. `alter table … add column` on the parent propagates to every partition, including `review_logs_default`. Add these rows to `004_seed_data.sql`'s fixture inserts too, so seeded history has realistic `elapsed_days`.

### 1.2 Code

* `SrsService.rate()` writes `source`, `elapsed_days` (`now − last_reviewed_at`, in days) and `scheduled_days` (the current `interval_days`) from day one. That's already useful before FSRS exists.
* `RateWordDto` / `SyncReviewItemDto`: no client change needed. `source` is decided server-side by which endpoint was called.

---

## Workstream 2 — FSRS engine

### 2.1 Library: `ts-fsrs`

* `ts-fsrs` **5.4.2** (checked 2026-09-25), MIT, implements **FSRS-6**. Ships a CommonJS build, so it works with the backend's `"module": "commonjs"`. Requires Node ≥ 20, which matches `node:20-alpine` in the backend `Dockerfile`.
* Pure TypeScript, no native deps. Used only in the backend; the frontend never schedules.
* API used: `fsrs(generatorParameters({...}))`, `createEmptyCard()`, `f.next(card, now, grade)`, `f.get_retrievability(card, now)`, `f.reschedule(card, history)` (for the backfill in §2.4).

### 2.2 Parameters — `src/modules/srs/fsrs-config.ts`

```ts
export const FSRS_PARAMS = generatorParameters({
  request_retention: 0.95,     // see table below; Decision 2
  maximum_interval: 180,       // days; a young learner's word should resurface at least twice a year
                               // (ts-fsrs keeps HARD < GOOD < EASY by ≥1 day each, so EASY can reach 182)
  enable_fuzz: true,           // spreads same-day due spikes (off in unit tests for determinism)
  enable_short_term: true,
  learning_steps: [],          // study sessions are a fixed snapshot (no in-session re-show), so
                               // minute-level learning steps would just defer a new word to "next session"
  relearning_steps: ['10m'],   // keeps FR-3.2's "Again: < 10 min" behavior
  // w: default FSRS-6 weights until Workstream 5 optimizes them
});
```

**Measured with `ts-fsrs` 5.4.2, default weights, no fuzz, a new card rated GOOD every time it comes due:**

| `request_retention` | Intervals (days) |
|---|---|
| 0.85 | 4 → 31 → 173 → 180 (cap) |
| 0.90 (FSRS default) | 2 → 11 → 46 → 163 → 180 (cap) |
| **0.95 (recommended)** | **1 → 3 → 8 → 19 → 43 → 89** |

0.95 almost exactly reproduces FR-3.2's current 1d → 3d → 7d → 16d ladder, so learners see no sudden jump in spacing at cutover. For young children, a higher success rate also helps motivation. The cost is more reviews per day than 0.90. Decided: 0.95 (Decision 2); the value is one constant.

**Same settings, the problem cases from §0:**

| Scenario | SM-2 today | FSRS @ 0.95 |
|---|---|---|
| HARD every time | 1 → 1 → 1 → 1 … (bug #1) | 1 → 1 → 2 → 3 → 3 → 4 → 5 → 6 (grows, slowly) |
| EASY on a new card | 1 day (bug #3) | ~8 days (measured at 0.90) |
| GOOD reviewed 20 days late | same next interval as on time (bug #5) | longer next interval: at 0.90, 11 d on time vs 34 d when 20 d late |
| GOOD, GOOD, AGAIN, GOOD, GOOD (0.90) | ladder restarts at 1 d | 2 → 11 → 10 min → 2 → 5 (difficulty rises 2.1 → 7.4, stability partly kept) |

### 2.3 New pure module — `src/modules/srs/fsrs-scheduler.ts`

Same pure-math / I-O split `srs-algorithm.ts` established: no DB access, unit-testable in isolation.

```ts
export type SrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface FsrsCardState {
  state: 'New' | 'Learning' | 'Review' | 'Relearning';
  stability: number;       // days
  difficulty: number;      // 1–10
  reps: number;
  lapses: number;
  learningSteps: number;
  scheduledDays: number;
  lastReviewAt: Date | null;
  dueAt: Date;
}

export interface FsrsOutcome {
  card: FsrsCardState;
  stateBefore: FsrsCardState['state'];
  elapsedDays: number;
  retrievabilityBefore: number | null; // null for a New card
  wasCorrect: boolean;                 // rating !== 'AGAIN'
  mistakeIncrement: 0 | 1;
}

export function newCard(now: Date): FsrsCardState;
export function schedule(card: FsrsCardState, rating: SrsRating, now: Date): FsrsOutcome;
export function isMastered(card: Pick<FsrsCardState, 'stability'>): boolean; // §2.6
```

Constants that **survive** from `srs-algorithm.ts` (moved here): `LEECH_THRESHOLD = 4` (FR-3.3). Constants that are **deleted**: `QUALITY_BY_RATING`, `STANDARD_INTERVALS_DAYS`, `LAMBDA`, `MIN_EASE_FACTOR`, `AGAIN_RELEARN_MINUTES` (replaced by `relearning_steps`), `MASTERY_THRESHOLD` (replaced by `MASTERY_STABILITY_DAYS`).

### 2.4 Migration `020_fsrs_card_state.sql` + backfill

```sql
create type public.fsrs_state as enum ('New', 'Learning', 'Review', 'Relearning');

alter table public.user_word_srs
  add column fsrs_state      public.fsrs_state not null default 'New',
  add column stability       real    check (stability is null or stability > 0),
  add column difficulty      real    check (difficulty is null or difficulty between 1 and 10),
  add column reps            integer not null default 0 check (reps >= 0),
  add column lapses          integer not null default 0 check (lapses >= 0),
  add column learning_steps  integer not null default 0,
  add column scheduled_days  real    not null default 0;

-- mastery reads (tier ladder, collection rings, stats) filter on stability
create index user_word_srs_stability_idx on public.user_word_srs (user_id, stability);
```

**Backfill** (one-off script `com.dygoacademy.backend/scripts/backfill-fsrs.js`, run once after 020, idempotent):

1. For every `user_word_srs` row, load that word's `review_logs` in `reviewed_at` order.
2. Replay them through `f.reschedule(createEmptyCard(firstReview), history)` with `AGAIN/HARD/GOOD/EASY` mapped to `Rating.Again..Easy`. That produces real FSRS stability/difficulty from the actual review history, not a formula guess.
3. **Rows with no logs** (seed data, or history lost): heuristic from SM-2 state:
   `stability = max(interval_days, 0.5)`, `difficulty = clamp(5 + (2.5 − ease_factor) × 2.5, 1, 10)`, `fsrs_state = 'Review'` if `repetitions > 0` else `'New'`.
4. **Keep the existing `next_due_at`** for every row. Rescheduling everyone at once would cause a due-count spike on cutover day. Each card moves onto FSRS timing at its next natural review.

### 2.5 `SrsService.rate()` changes

Same single transaction, same order. Only the state read and write change:

1. Read the row's FSRS columns (or `newCard(now)` when there's no row).
2. **One-graded-review-per-day guard** (bug #8): if `last_reviewed_at` falls on the same local calendar day as `now` (via the existing `resolveUserTimezone()`) **and** the rating is not `AGAIN`, write the `review_logs` row with `graded = false` and return the current state unchanged. An `AGAIN` always grades (see §3.1 for the one-lapse-per-day cap).
3. `schedule(card, rating, now)` → write `stability`, `difficulty`, `fsrs_state`, `reps`, `lapses`, `learning_steps`, `scheduled_days`, `next_due_at = card.dueAt`, `last_reviewed_at = now`.
4. Leech bookkeeping unchanged: count `AGAIN` rows in the last 7 days, `is_leech = recent >= LEECH_THRESHOLD`. **The λ·M_recent term is dropped**, because FSRS already raises difficulty on every `AGAIN`.
5. `review_logs` insert adds `state_before`, `elapsed_days`, `scheduled_days`, `stability_after`, `difficulty_after`.
6. `just_mastered = !isMastered(before) && isMastered(after)`.

`sync()` needs no structural change. It already replays offline reviews in `reviewedAt` order with each item's own timestamp as `now`, which is exactly what FSRS's elapsed-time model wants.

### 2.6 Mastery redefined on stability

```ts
/** A word is mastered when FSRS predicts it will still be recalled ~3 weeks out. */
export const MASTERY_STABILITY_DAYS = 21;
export const isMastered = (c: { stability: number | null }) => (c.stability ?? 0) >= MASTERY_STABILITY_DAYS;
```

At 0.95 retention, measured: GOOD-every-time crosses 21 days on the **4th** review (same as today's `repetitions >= 4`). Alternating HARD/GOOD crosses on the **6th** (corrected during the build; an earlier table rounded 20.6 up to 21). HARD-only has not crossed after **8** reviews (stability 14), which fixes bug #2.

Every site that hard-codes `repetitions >= MASTERY_THRESHOLD` switches to `stability >= MASTERY_STABILITY_DAYS`:

* `srs.service.ts` — `computeSrsSummary` (`mastered_words`), `getTierProgress`, `rate()` (`just_mastered`)
* `topics.service.ts` — `findAllVisible`'s `mastered_count`
* spec assertions: `topics.service.spec.ts` (`/repetitions >= 4/`), `srs.service.spec.ts` (`just_mastered` cases)
* frontend doc comments: `types/topic.ts`, `app/(dashboard)/study/page.tsx`

**No visible drop at cutover** (Decision 3): mastery is stored as a sticky `mastered_at`, grandfathered for every word mastered under SM-2, and cleared only by a graded mistake. The HARD-inflation bug stops applying to *new* mastery from day one.

### 2.7 API response shape

`RateWordResult`, `DueCard` (backend `srs.service.ts`, frontend `types/srs.ts`):

| Removed | Added |
|---|---|
| `ease_factor`, `interval_days`, `repetitions` | `state`, `stability`, `difficulty`, `scheduled_days`, `reps`, `lapses`, `is_mastered`; `RateWordResult` also gets `rating` (as applied) and `graded`; `DueCard` also gets `last_reviewed_at` and `retrievability` (0–1, computed at read time; `null` for new cards) |

`is_leech`, `was_correct`, `next_due_at`, `just_mastered` stay. Grep shows no frontend component *renders* the removed fields today (only type definitions and comments), so the UI change is types-only. `retrievability` is newly available for a future "memory strength" indicator but not required by this phase.

---

## Workstream 3 — Grading policy: quizzes feed the SRS

### 3.1 One grading table (all sources)

`src/modules/srs/grading.ts`, pure:

| Event | FSRS grade | `graded` |
|---|---|---|
| Any wrong answer (flashcard "Didn't know", any quiz type, leech drill) | `AGAIN` | yes, but **at most one lapse per word per local day** (a second miss the same day is logged with `graded = false`, so a flashcard miss followed by a re-quiz miss doesn't count twice toward the 4-in-7-days leech threshold) |
| MATCHING / CONTEXTUAL_CHOICE correct (recognition) | `HARD` | yes, if first graded review today |
| CLOZE / DICTATION correct (recall) | `GOOD` | yes, if first graded review today |
| DICTATION correct and `responseMs` under a threshold | `EASY` | yes, if first graded review today (threshold tuned from Workstream 1 data; ship without it initially) |
| Any correct quiz answer with `hintUsed = true` | capped at `HARD` | yes, if first graded review today |
| Any correct answer on a word that isn't due yet (e.g. already reviewed today) | — | **no** (logged only). A word in its 10-minute relearning step *is* due, so the retry grades |
| Flashcard "Didn't know" / "Knew it" / held "almost" | `AGAIN` / `GOOD` / `HARD` | yes (the /study queue only shows due cards) |
| Flashcard held "Too easy" | `EASY`, or `GOOD` on a word's first review | yes |

### 3.2 Quiz wiring

* New `SrsService.recordQuizResult(userId, { topicWordId, quizType, correct, hintUsed, responseMs, source }, now)`. It maps through `grading.ts` and then runs the same transaction as `rate()` (shared private method, not a copy).
* `QuizService.answer()` calls it after grading. `source = 'leech_drill'` when the item came from `leechDrill()`, otherwise `'quiz'`. **A failure here must not fail the answer response**: log a warning and still return `AnswerResult`, the same degrade-don't-500 rule the Gemini nuance call already follows.
* `AnswerResult` gains `srs?: { just_mastered: boolean; next_due_at: string; graded: boolean }` so the quiz screen can show the same "+N mastered" feedback `/study` does.
* `useSubmitQuizAnswer.ts`: its comment ("no `review_logs` row, no `user_word_srs` change") becomes false. Update it; its `['srs']` invalidation is now actually needed.

---

## Workstream 4 — Cutover and SM-2 removal

| Step | What | Reversible? |
|---|---|---|
| **A. Dual-write** (optional, 1–2 weeks) | FSRS columns written on every review alongside SM-2; SM-2 still sets `next_due_at`. Log both predicted due dates. **Can be skipped**: the current user base is small and mostly fixture accounts, so the comparison data would be thin | Yes |
| **B. Switch** | `rate()` / `recordQuizResult()` schedule from FSRS only. SM-2 columns no longer written. Deploy with the usual discipline: verify `dist/` contains `fsrs-scheduler`, then `pm2 restart dygo-backend` | Yes (revert deploy; SM-2 columns still hold their last values) |
| **C. Remove code** | Delete `srs-algorithm.ts` + `srs-algorithm.spec.ts`; drop `ease_factor`/`interval_days`/`repetitions` from DTOs, types, specs, `004_seed_data.sql`, `automationtesting/api/specs/srs.spec.ts` (its `interval_days` assertion becomes a `scheduled_days`/`next_due_at` assertion) | Yes, via git |
| **D. Drop columns** — `021_drop_sm2_columns.sql` | `alter table user_word_srs drop column ease_factor, drop column interval_days, drop column repetitions;` **Keep** `review_logs.ease_factor_after` / `interval_days_after` as historical record; nothing writes them any more | **No**. Run only after B has been live and verified for at least a week |

### 4.1 Docs updated in the same change as step C

* `docs/product/dygo_academy_final_master_brd.md` — **FR-3.1** (the SM-2 EF formula) is replaced by "FSRS-6 memory model (stability, difficulty, retrievability) with a target retention of R"; **FR-3.2** keeps the four buttons, with their meaning restated as FSRS grades and "< 10 min" as the relearning step. FR-3.3 and FR-3.4 are unchanged.
* `docs/architecture/dygo_academy_api_surface.md` — `/srs/rate` row, and §5.4's "SM-2 `q` mapping" note.
* `docs/architecture/dygo_academy_database_dictionary.md` — `user_word_srs` column list (drop the "SM-2 floor" note at `ease_factor`).
* `README.md` — spaced-repetition description.
* `Change Log.md` — one entry per step (A–D).

---

## Workstream 5 — Parameter optimization (after cutover, when data allows)

* FSRS's default weights are fit on millions of adult Anki reviews, not young learners' vocabulary. Once Workstream 1 has accumulated roughly **1,000+ graded reviews** in total, fit **one Dygo-wide weight set** with the official optimizer (`fsrs-rs` / its Python or Node binding) from `review_logs` and ship it as `FSRS_PARAMS.w`.
* Per-learner weights only make sense once individual learners have that much history. Out of scope for Phase 10.
* Monitor from day one: **true retention** = share of graded reviews in `Review` state that are not `AGAIN`, grouped by week. It should sit near `request_retention`. A large gap means the weights (or grading policy) need attention.

---

## Test plan

| Area | Case | Expected |
|---|---|---|
| `fsrs-scheduler.spec.ts` | New card, GOOD ×6 @ 0.95, fuzz off | 1 → 3 → 8 → 19 → 43 → 89 days |
| | HARD ×8 | interval strictly non-decreasing and > 1 d by the 3rd review (regression for bug #1) |
| | AGAIN on a Review card | due in 10 min, `lapses + 1`, state `Relearning`, stability lower but > 0 |
| | GOOD reviewed 20 d late vs on time | late review yields the longer next interval (bug #5) |
| | `isMastered` | GOOD path crosses on review 4; HARD-only not mastered after 8 (bug #2) |
| `grading.spec.ts` | every row of §3.1 | exact grade and `graded` flag |
| `srs.service.spec.ts` | same-day second GOOD | `graded = false`, `user_word_srs` untouched |
| | same-day second AGAIN | second one `graded = false`; leech count +1 only |
| | `just_mastered` | true only on the crossing review |
| `quiz.service.spec.ts` | wrong answer | `recordQuizResult` called with `correct = false`; answer still returned if it throws |
| | correct CLOZE with hint | graded `HARD` |
| backfill script | word with logs vs without | replayed state vs heuristic state; `next_due_at` unchanged |
| migrations | 019/020/021 on a fresh `apply-migrations.sh --seed` and on a copy of production | clean; RLS suite (`database/tests/rls_test.sql`) still passes |
| live (production) | signed in as `sarah@dygo.test`: rate a card, answer a quiz wrong, answer a quiz right twice | `review_logs` shows `source`/`graded` correctly; Home stats/tier ladder load; no console errors |

---

## Decisions (2026-09-25, customer-experience review)

1. **Flashcard "Knew it" keeps counting at face value (GOOD); NOT capped at HARD.** This reverses the earlier recommendation. HARD-only FSRS spacing is 1 → 1 → 2 → 3 → 3 → 4 days, so a learner who really knows their words would see them almost daily and feel the app doesn't believe them. Quizzes are the honesty check instead. **Exception:** "Too easy" (EASY) on a word's very first review counts as GOOD, so one tap can't push a brand-new word ~8 days away.
2. **Target retention 0.95**: learners see no change in spacing at the switch (1 → 3 → 8 → 19 days) and succeed on ~95% of reviews.
3. **No mastery drop at the switch.** Mastery is a sticky `mastered_at` column: set when stability first reaches 21 days, cleared only by a graded AGAIN (a mistake the learner saw). Migration 020 grandfathers every SM-2-mastered word (`repetitions >= 4`), and the backfill script never clears it. No release note is needed.
4. **No dual-write step (Workstream 4 A skipped).** Instead, 020 never changes `next_due_at`, so there is no due-count spike; each word moves onto FSRS timing at its next natural review.
5. **Grading rules, refined during the build:** a success grades only when the word is due or brand new. This covers the 10-minute relearning retry: the plain "first review of the day only" rule would have left a just-missed word stuck due all day. At most one graded mistake per word per local day (learner timezone via `resolveUserTimezone`); later ones are logged with `graded = false` and never count toward the leech threshold.
6. **Backfill replays only complete histories.** A word whose `review_logs` don't account for every SM-2 success and mistake keeps 020's heuristic. In testing, replaying a partial history understated what the learner knew (stability 2.3 d vs 7 d, lapses 6 → 0).
7. **`fsrs_backfilled` defaults to true after 020**, so the application never writes it and 021 can drop it without breaking a single write path. This was found in testing: the first version wrote the column and would have failed every review after 021.

## Recommended sequencing

1. **Workstream 1** (logging) — small, no behavior change, ship immediately.
2. **Workstream 2** + **Workstream 3** together behind step B of Workstream 4. They share `rate()`'s transaction, so building them separately means rewriting it twice.
3. **Workstream 4** steps C → D, with D at least a week after B is verified live.
4. **Workstream 5** once enough graded reviews exist.
5. Then **Phase 11** (locale / household / i18n), whose RLS rewrite now targets the final `user_word_srs` / `review_logs` shape.

**Definition of done**: no reference to `ease_factor`, `repetitions`, `STANDARD_INTERVALS_DAYS`, `LAMBDA` or "SM-2" left in `com.dygoacademy.backend/src`, `com.dygoacademy.frontend/src` or `com.dygoacademy.automationtesting` (grep clean, excluding historical `review_logs` columns and migrations 001–020); full backend suite green; `tsc --noEmit` and lint clean on both sides; migrations 019–021 applied on production; live verification row above passed.
