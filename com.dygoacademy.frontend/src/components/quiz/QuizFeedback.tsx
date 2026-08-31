'use client';

import type { QuizAnswerResult } from '@/types';

/**
 * FR-5.5 — shown after a submission. The nuance-explanation paragraph only
 * exists on `result` when the answer was wrong (`QuizService.answer` never
 * spends a Gemini call on a correct one), so there is nothing to
 * conditionally hide here beyond checking the field is present.
 */
export function QuizFeedback({
  result,
  onNext,
}: {
  result: QuizAnswerResult;
  onNext: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border-2 p-5 text-sm ${
        result.correct
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-destructive/40 bg-destructive/5'
      }`}
    >
      <p className="font-semibold">
        {result.correct ? 'Correct!' : `Not quite — it was "${result.correctAnswer}"`}
      </p>
      {result.nuanceExplanation && <p className="text-muted-foreground">{result.nuanceExplanation}</p>}
      <button
        type="button"
        onClick={onNext}
        className="mt-1 self-start rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground"
      >
        Next →
      </button>
    </div>
  );
}
