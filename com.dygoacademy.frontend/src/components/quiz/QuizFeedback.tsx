'use client';

import { Button } from '@/components/ui/button';
import { formatIpa } from '@/lib/utils';
import type { QuizAnswerResult } from '@/types';

/**
 * FR-5.5 — shown after a submission. The nuance-explanation paragraph only
 * exists on `result` when the answer was wrong (`QuizService.answer` never
 * spends a Gemini call on a correct one), so there is nothing to
 * conditionally hide here beyond checking the field is present.
 *
 * "Next" moved off a bare hand-rolled `<button>` onto the shared
 * `ui/button.tsx` `Button` (Radix Slot-backed, same primitive every other
 * button in this app composes from) and from `self-start` to `self-end`
 * -- live-requested 2026-09-18 ("change next button to radix ui style and
 * move to right"). Right-aligned because it's the one forward action on
 * this card, read left-to-right as "here's what happened (left-aligned
 * text) -> here's what to do next (bottom-right, where a Next/Continue
 * action conventionally sits, e.g. wizard/onboarding flows)" rather than
 * sitting flush under the text like just another line of copy.
 *
 * Word + IPA line added the same day ("We should push word and API [IPA]
 * to that correct to know what is it be done") -- a correct answer used
 * to say only "Correct!" with no confirmation of what word was actually
 * being tested or how to say it, while a wrong answer already got that
 * context for free via nuanceExplanation. Shown only on the correct path:
 * the wrong path's heading already names the word via `correctAnswer`
 * ("it was ..."), so repeating it there would be redundant -- this closes
 * the one-sided gap rather than duplicating what's already shown.
 *
 * Example sentence added the same day ("Any information we can give to
 * the student in correct result screen") -- of the options considered
 * (definition, example sentence, a replay-pronunciation button, a streak
 * counter), this was the one picked: seeing the word used in context right
 * after answering correctly is generally the single best thing for
 * retention, without turning the card into a second definition lookup.
 * Also correct-path-only, for the same reason as word/IPA above.
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
      {result.correct && (
        <p className="font-mono text-sm text-muted-foreground">
          {result.word}
          {formatIpa(result.ipaUs) && ` · ${formatIpa(result.ipaUs)}`}
        </p>
      )}
      {result.correct && result.exampleSentence && (
        <p className="text-muted-foreground italic">&quot;{result.exampleSentence}&quot;</p>
      )}
      {result.nuanceExplanation && <p className="text-muted-foreground">{result.nuanceExplanation}</p>}
      <Button type="button" onClick={onNext} size="sm" className="mt-1 self-end gap-1.5">
        Next
        <ArrowRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
