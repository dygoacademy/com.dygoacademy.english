/**
 * Phase 10, Workstream 3 — one grading policy for every source of review
 * evidence (`phase 10 implementation plan.md` §3). Pure, no I/O.
 *
 * The rules, and the customer-experience reasoning behind them (2026-09-25):
 *
 * - **Failures always count** (a wrong answer is trustworthy evidence
 *   wherever it happens), but **at most one lapse per word per local day**,
 *   so a flashcard miss followed by a targeted re-quiz miss can't count
 *   twice toward the 4-in-7-days leech threshold. One bad session should
 *   never label a word a leech.
 * - **Successes only move the schedule when the word is actually due** (or
 *   has never been reviewed). A correct answer on a word that isn't due yet
 *   only proves short-term memory. A word the learner just missed is due
 *   again after its 10-minute relearning step, so getting it right on the
 *   retry still counts.
 * - **Flashcard self-ratings keep counting at face value.** Capping
 *   "Knew it" at HARD was rejected: with FSRS, HARD-only spacing is
 *   1 → 1 → 2 → 3 → 3 → 4 days, so a learner who really knows their words
 *   would see them almost daily and feel the app doesn't believe them.
 *   Quizzes are the honesty check instead. One exception: "Too easy" on a
 *   word's very first sighting counts as GOOD, so one tap can't push a
 *   brand-new word ~8 days away.
 * - **Quiz difficulty sets the grade**: recognition (MATCHING,
 *   CONTEXTUAL_CHOICE) is weaker evidence than recall (CLOZE, DICTATION).
 *   A hint caps any correct answer at HARD.
 */
import type { SrsRating } from './fsrs-scheduler';

export type ReviewSource = 'flashcard' | 'quiz' | 'leech_drill' | 'sync';

/** Mirrors quiz-generator.ts's QUIZ_TYPES; kept local so srs/ doesn't import quiz/. */
export type GradedQuizType = 'CLOZE' | 'DICTATION' | 'MATCHING' | 'CONTEXTUAL_CHOICE';

const RECOGNITION_TYPES: ReadonlySet<GradedQuizType> = new Set(['MATCHING', 'CONTEXTUAL_CHOICE']);

export interface QuizEvidence {
  quizType: GradedQuizType;
  correct: boolean;
  hintUsed: boolean;
}

export function gradeQuizAnswer({ quizType, correct, hintUsed }: QuizEvidence): SrsRating {
  if (!correct) return 'AGAIN';
  if (hintUsed || RECOGNITION_TYPES.has(quizType)) return 'HARD';
  return 'GOOD';
}

/** Flashcard self-ratings count at face value, except EASY on a never-seen word. */
export function gradeFlashcard(rating: SrsRating, isNewCard: boolean): SrsRating {
  return rating === 'EASY' && isNewCard ? 'GOOD' : rating;
}

export interface GradingContext {
  rating: SrsRating;
  /** No user_word_srs row yet. */
  isNewCard: boolean;
  /** next_due_at <= now. */
  isDue: boolean;
  /** A graded AGAIN for this word already exists in the learner's current local day. */
  lapseAlreadyCountedToday: boolean;
}

export type GradingDecision =
  { graded: true } | { graded: false; reason: 'lapse_already_counted_today' | 'not_due' };

export function decideGrading(ctx: GradingContext): GradingDecision {
  if (ctx.rating === 'AGAIN') {
    return ctx.lapseAlreadyCountedToday
      ? { graded: false, reason: 'lapse_already_counted_today' }
      : { graded: true };
  }
  if (ctx.isNewCard || ctx.isDue) return { graded: true };
  return { graded: false, reason: 'not_due' };
}
