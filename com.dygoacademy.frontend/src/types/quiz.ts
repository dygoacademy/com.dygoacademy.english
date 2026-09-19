/**
 * Module 5 — Dynamic Multi-Modal Quiz Engine (Phase 3). Mirrors the
 * backend's `quiz-generator.ts` (`QuizType`/`QuizItem`) and `quiz.service.ts`
 * (`AnswerResult`) field-for-field, same "no camelCase drift" rule
 * `srs.ts`'s header comment already states for `DueCard`.
 */
export const QUIZ_TYPES = ['CLOZE', 'DICTATION', 'MATCHING', 'CONTEXTUAL_CHOICE'] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

/** `POST /api/v1/quizzes/generate` and `GET /api/v1/quizzes/leech-drill` response item. */
export interface QuizItem {
  /** `${topicWordId}:${type}` — deterministic; no persisted quiz/session row backs it. */
  id: string;
  type: QuizType;
  topicWordId: string;
  topicId: string;
  prompt: string;
  audioUrl?: string | null;
  /** Only present for CHOICE-mode items (MATCHING, CONTEXTUAL_CHOICE). */
  options?: string[];
  answerMode: 'TEXT' | 'CHOICE';
}

/** `POST /api/v1/quizzes/:id/answer` response — QuizService.AnswerResult. */
export interface QuizAnswerResult {
  quizItemId: string;
  correct: boolean;
  correctAnswer: string;
  /**
   * The word this item was testing, plus its US IPA -- live-requested
   * 2026-09-18 ("push word and IPA to that correct"), so a correct
   * answer's feedback card can show what was actually learned, not just
   * "Correct!". See QuizService.answer's own comment for why this is
   * free (same row already queried to grade the answer).
   */
  word: string;
  ipaUs: string | null;
  /**
   * The word's first example sentence, unmasked -- live-requested
   * 2026-09-18 ("Any information we can give to the student in correct
   * result screen"). Same free-row reasoning as `word`/`ipaUs`: see
   * QuizService.AnswerResult's own comment on this field on the backend.
   */
  exampleSentence?: string;
  /** FR-5.5 — only present on a wrong answer. */
  nuanceExplanation?: string;
  /**
   * Echo of whether `GET /quizzes/:id/hint` was opened before this answer
   * was submitted -- live-requested 2026-09-16. Not (yet) used to change
   * grading or SRS scheduling; see `AnswerResult.hintUsed`'s backend
   * comment for why.
   */
  hintUsed: boolean;
}

/** `GET /api/v1/quizzes/:id/hint` response — QuizService.hint. */
export interface QuizHint {
  ipaUs: string | null;
  definition: string | null;
}
