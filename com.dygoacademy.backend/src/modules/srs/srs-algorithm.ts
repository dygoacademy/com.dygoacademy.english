/**
 * Module 3 — Error-Adaptive Spaced Repetition (FR-3.1/3.2/3.3), pure
 * functions only. No DB access here on purpose: `SrsService` owns I/O and
 * transactions, this file owns the math, so the math can be unit tested
 * without a database — same split as `GeminiEnrichmentService.pcmToWav`.
 *
 * ---
 *
 * ## Design decisions made here (none of these are pinned by the BRD)
 *
 * **Rating → quality (`q`) mapping.** FR-3.1's formula is SM-2's EF update,
 * which expects `q` on a 0–5 scale, but Module 3 only exposes 4 buttons
 * (FR-3.2). Mapped onto the conventional SM-2/Anki scale: `AGAIN`→0 (complete
 * blackout), `HARD`→3, `GOOD`→4, `EASY`→5. This keeps the formula's
 * documented shape (Good is EF-neutral before the M_recent penalty, Easy is
 * a small bonus, Again is a large penalty) rather than inventing a new curve.
 *
 * **λ (lambda).** Not specified anywhere. Set to 0.05: `recent_mistakes`
 * realistically ranges 0–6ish (the leech threshold is 4), so the penalty
 * tops out around -0.3, comparable to the formula's own swing between Again
 * (-0.8) and Easy (+0.1) without letting recent mistakes alone drive EF
 * negative. Tunable — exported as `LAMBDA` for one place to change it.
 *
 * **`recent_mistakes` decay — the open question flagged in
 * `dygo_academy_api_surface.md` §5.4.** Resolved as: *recompute from
 * `review_logs` on every `POST /srs/rate` call, not on a schedule.* The
 * count query (`rating = 'AGAIN' AND reviewed_at >= now() - interval '7
 * days'`) already runs inside the same transaction that writes the review
 * log, so aging old mistakes out of the window costs nothing extra — the
 * *next* rating call for that word simply sees a 7-day window anchored to
 * *then*, naturally excluding anything that has aged out. No third
 * repeating job, and `GET /srs/leeches` still reads a plain stored column
 * (`is_leech`), not a live aggregate, so that query stays index-only. The
 * cost lands on `POST /srs/rate`, which has no documented SLO — the p95 <
 * 15ms budget (FR-3.4) belongs to the *read* path (`GET .../cards/due`),
 * which this function never touches.
 *
 * **Interval ladder.** FR-3.2 gives four fixed points — "1d → 3d → 7d →
 * 16d…" — then trails off. Implemented as `STANDARD_INTERVALS` for
 * `repetitions` 1–4, then `round(interval_days * ease_factor)` after that
 * (standard SM-2 growth), which lands close to 16 from 7 with the default
 * 2.5 ease factor (7 × 2.5 = 17.5 ≈ 16) without hard-coding a fifth point.
 *
 * **HARD does not follow the ladder.** FR-3.2 gives Hard its own rule
 * ("short interval multiplier ×1.2") distinct from Good's ladder
 * progression, so Hard multiplies the *previous* interval instead of
 * looking up the ladder — a card can be on Hard for several reviews in a
 * row without ever jumping to the Good ladder's pace.
 *
 * **AGAIN's "< 10 min".** Implemented literally: `next_due_at = now + 10
 * minutes`, `interval_days`/`repetitions` reset to 0. This is a relearning
 * step, not a full ladder restart in the SM-2 sense of losing the ease
 * factor — only `interval_days`/`repetitions` reset; `ease_factor` still
 * moves by the formula (a heavily-penalized amount, per the q=0 case).
 */

export type SrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

/** SM-2/Anki convention: 0 = complete blackout, 5 = perfect recall. */
const QUALITY_BY_RATING: Record<SrsRating, number> = {
  AGAIN: 0,
  HARD: 3,
  GOOD: 4,
  EASY: 5,
};

/** FR-3.2's four named points; index 0 is the interval after the *first* success. */
export const STANDARD_INTERVALS_DAYS = [1, 3, 7, 16];

/** See "λ (lambda)" above. */
export const LAMBDA = 0.05;

/** SM-2's conventional floor — below it, intervals stop growing meaningfully. */
export const MIN_EASE_FACTOR = 1.3;

/** FR-3.3 — ≥ 4 failures in a rolling 7-day window. */
export const LEECH_THRESHOLD = 4;

/** AGAIN's relearning step (FR-3.2: "< 10 min"). */
export const AGAIN_RELEARN_MINUTES = 10;

export interface SrsCardState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface RatingOutcome {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextDueAt: Date;
  /** 1 if this rating counts as a fresh mistake (AGAIN), else 0. */
  mistakeIncrement: 0 | 1;
  wasCorrect: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * FR-3.1's formula:
 * `EF' = EF + (0.1 - (5-q)(0.08 + (5-q)(0.02))) - (λ * M_recent)`,
 * floored at `MIN_EASE_FACTOR`.
 *
 * @param recentMistakesBefore `M_recent` — mistakes on this word in the 7
 *   days *before* this review (see the module doc's decay section).
 */
export function computeEaseFactor(
  currentEaseFactor: number,
  rating: SrsRating,
  recentMistakesBefore: number,
): number {
  const q = QUALITY_BY_RATING[rating];
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const raw = currentEaseFactor + delta - LAMBDA * recentMistakesBefore;
  return Math.max(MIN_EASE_FACTOR, round2(raw));
}

/** The Good-ladder interval for a card entering its Nth successful repetition (1-based). */
function ladderIntervalDays(
  repetitionsAfter: number,
  easeFactor: number,
  previousIntervalDays: number,
): number {
  if (repetitionsAfter <= STANDARD_INTERVALS_DAYS.length) {
    return STANDARD_INTERVALS_DAYS[repetitionsAfter - 1];
  }
  return Math.max(1, Math.round(previousIntervalDays * easeFactor));
}

/**
 * Applies one rating to a card's current state. Pure — the caller
 * (`SrsService`) is responsible for reading `recentMistakesBefore` from
 * `review_logs` and persisting the result.
 */
export function applyRating(
  current: SrsCardState,
  rating: SrsRating,
  recentMistakesBefore: number,
  now: Date = new Date(),
): RatingOutcome {
  const easeFactor = computeEaseFactor(current.easeFactor, rating, recentMistakesBefore);

  if (rating === 'AGAIN') {
    const nextDueAt = new Date(now.getTime() + AGAIN_RELEARN_MINUTES * 60_000);
    return {
      easeFactor,
      intervalDays: 0,
      repetitions: 0,
      nextDueAt,
      mistakeIncrement: 1,
      wasCorrect: false,
    };
  }

  const repetitions = current.repetitions + 1;
  const ladder = ladderIntervalDays(repetitions, easeFactor, Math.max(current.intervalDays, 1));

  let intervalDays: number;
  if (rating === 'HARD') {
    // Deliberately not the ladder — FR-3.2 gives Hard its own multiplier
    // against the *previous* interval, see module doc.
    intervalDays = Math.max(1, Math.round(Math.max(current.intervalDays, 1) * 1.2));
  } else if (rating === 'EASY') {
    intervalDays = Math.max(1, Math.round(ladder * 1.3));
  } else {
    intervalDays = ladder;
  }

  const nextDueAt = new Date(now.getTime() + intervalDays * 86_400_000);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextDueAt,
    mistakeIncrement: 0,
    wasCorrect: true,
  };
}
