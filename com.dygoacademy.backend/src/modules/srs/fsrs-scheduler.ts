/**
 * Phase 10 — FSRS-6 scheduling, pure functions only (`phase 10
 * implementation plan.md` §2.3). Replaces the SM-2 variant that used to live
 * in `srs-algorithm.ts`. Same split as before: `SrsService` owns I/O and
 * transactions; this file owns the math, so it can be unit tested without a
 * database. The FSRS model itself comes from `ts-fsrs`; this file only
 * adapts Dygo's row shape to it and adds Dygo's own rules (mastery, leech).
 */
import { Card, FSRS, Grade, Rating, State, createEmptyCard, fsrs } from 'ts-fsrs';

import { buildFsrsParams } from './fsrs-config';

export type SrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
export type FsrsStateName = 'New' | 'Learning' | 'Review' | 'Relearning';

/** FR-3.3 — >= 4 graded mistakes in a rolling 7-day window. */
export const LEECH_THRESHOLD = 4;
export const LEECH_WINDOW_DAYS = 7;

/**
 * A word becomes mastered once FSRS predicts it will still be recalled about
 * three weeks out. At the configured 0.95 retention, measured with ts-fsrs
 * 5.4.2: GOOD every time crosses this on the 4th review (same pace as the old
 * `repetitions >= 4` rule), alternating HARD/GOOD on the 6th, and HARD-only
 * has not crossed after 8 reviews, which fixes the old "four HARDs =
 * mastered" bug.
 */
export const MASTERY_STABILITY_DAYS = 21;

const DAY_MS = 86_400_000;

export interface FsrsCardState {
  state: FsrsStateName;
  /** Days. Null for a New card. */
  stability: number | null;
  /** 1–10. Null for a New card. */
  difficulty: number | null;
  reps: number;
  lapses: number;
  learningSteps: number;
  scheduledDays: number;
  lastReviewAt: Date | null;
  dueAt: Date;
}

export interface FsrsOutcome {
  card: FsrsCardState;
  stateBefore: FsrsStateName;
  /** Actual days since the previous review; null for a first review. */
  elapsedDays: number | null;
  /** Recall probability just before this review; null for a New card. */
  retrievabilityBefore: number | null;
  wasCorrect: boolean;
}

const RATING_TO_GRADE: Record<SrsRating, Grade> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

const STATE_BY_NAME: Record<FsrsStateName, State> = {
  New: State.New,
  Learning: State.Learning,
  Review: State.Review,
  Relearning: State.Relearning,
};

const NAME_BY_STATE: Record<State, FsrsStateName> = {
  [State.New]: 'New',
  [State.Learning]: 'Learning',
  [State.Review]: 'Review',
  [State.Relearning]: 'Relearning',
};

/** The production scheduler (fuzz on). Tests pass their own via `createScheduler`. */
export function createScheduler(...args: Parameters<typeof buildFsrsParams>): FSRS {
  return fsrs(buildFsrsParams(...args));
}
const defaultScheduler = createScheduler();

export function newCard(now: Date): FsrsCardState {
  return {
    state: 'New',
    stability: null,
    difficulty: null,
    reps: 0,
    lapses: 0,
    learningSteps: 0,
    scheduledDays: 0,
    lastReviewAt: null,
    dueAt: now,
  };
}

/**
 * Dygo row → ts-fsrs card. A non-New card with no stability (should not
 * happen after migration 020's backfill, but a hand-edited row could) is
 * treated as New rather than crashing the review.
 */
function toLibCard(c: FsrsCardState): Card {
  if (c.state === 'New' || c.stability == null || c.difficulty == null) {
    return createEmptyCard(c.dueAt);
  }
  // A converted row with no recorded last review: infer it from the planned
  // interval so elapsed-time math has something sensible to work with.
  const lastReview = c.lastReviewAt ?? new Date(c.dueAt.getTime() - c.scheduledDays * DAY_MS);
  return {
    due: c.dueAt,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: 0,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: STATE_BY_NAME[c.state],
    last_review: lastReview,
  };
}

function fromLibCard(card: Card): FsrsCardState {
  return {
    state: NAME_BY_STATE[card.state],
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learning_steps,
    scheduledDays: card.scheduled_days,
    lastReviewAt: card.last_review ?? null,
    dueAt: card.due,
  };
}

/** Recall probability (0–1) at `now`; null for a card that has never been reviewed. */
export function retrievability(
  c: FsrsCardState,
  now: Date,
  scheduler: FSRS = defaultScheduler,
): number | null {
  if (c.state === 'New' || c.stability == null) return null;
  return scheduler.get_retrievability(toLibCard(c), now, false);
}

/** Applies one graded review. Pure: the caller persists the result. */
export function schedule(
  current: FsrsCardState,
  rating: SrsRating,
  now: Date,
  scheduler: FSRS = defaultScheduler,
): FsrsOutcome {
  const lib = toLibCard(current);
  const retrievabilityBefore = retrievability(current, now, scheduler);
  const { card } = scheduler.next(lib, now, RATING_TO_GRADE[rating]);
  const elapsedDays = current.lastReviewAt
    ? Math.max(0, (now.getTime() - current.lastReviewAt.getTime()) / DAY_MS)
    : null;

  return {
    card: fromLibCard(card),
    stateBefore: NAME_BY_STATE[lib.state],
    elapsedDays,
    retrievabilityBefore,
    wasCorrect: rating !== 'AGAIN',
  };
}

/**
 * Sticky mastery (customer-experience decision, 2026-09-25): once a word
 * reaches MASTERY_STABILITY_DAYS it stays mastered until the learner
 * actually gets it wrong. Mastered counts therefore never drop without a
 * mistake the learner saw themselves.
 */
export function nextMasteredAt(
  masteredAtBefore: Date | null,
  after: Pick<FsrsCardState, 'stability'>,
  rating: SrsRating,
  now: Date,
): Date | null {
  if (rating === 'AGAIN') return null;
  if (masteredAtBefore) return masteredAtBefore;
  return (after.stability ?? 0) >= MASTERY_STABILITY_DAYS ? now : null;
}
