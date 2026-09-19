'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { QuizFeedback } from '@/components/quiz/QuizFeedback';
import { QuizQuestion } from '@/components/quiz/QuizQuestion';
import { CONTENT_WIDTH } from '@/constants/layout';
import { ROUTES } from '@/constants/routes';
import { useGenerateQuiz } from '@/hooks/useGenerateQuiz';
import { useLeechDrillQuiz } from '@/hooks/useLeechDrillQuiz';
import { useSubmitQuizAnswer } from '@/hooks/useSubmitQuizAnswer';
import type { QuizAnswerResult } from '@/types';

/**
 * Module 5 — the quiz session (Phase 3), same shape as `/study`'s
 * `StudyPage`/`StudySessionScreen` split: `useSearchParams()` needs a
 * Suspense boundary for Next's static rendering, so the outer component
 * only provides the fallback and the inner one holds the real logic.
 *
 * Two entry points share this one page: `?topicId=` (FR-5.1–5.4, a normal
 * quiz batch via `POST /quizzes/generate`) and `?mode=leech` (FR-3.3's
 * remedial drill via `GET /quizzes/leech-drill`). Both hooks are called
 * unconditionally — see `useGenerateQuiz`'s comment — with `enabled`
 * deciding which one actually fetches, so only one network call happens
 * per visit regardless of which mode this is.
 *
 * `max-w-xs` -> `max-w-sm` on every screen state here -- live-reported
 * 2026-09-05 ("the quiz and flash card screen too small"), matching
 * `/study`'s same-day width bump. Widened again to `max-w-md` the same
 * day ("the page quiz should have more space of width") -- `/study`
 * stayed at `max-w-sm` since only the quiz page's own testing flagged it.
 */
export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center p-4`}>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <QuizScreen />
    </Suspense>
  );
}

function QuizScreen() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topicId') ?? undefined;
  const isLeechDrill = searchParams.get('mode') === 'leech';

  const generated = useGenerateQuiz(topicId, undefined, 10, !isLeechDrill);
  const leechDrill = useLeechDrillQuiz(isLeechDrill);
  const { data, isLoading, isError, refetch } = isLeechDrill ? leechDrill : generated;

  const submitAnswer = useSubmitQuizAnswer();
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const items = data ?? [];
  const item = items[index];
  const done = !isLoading && index >= items.length;

  function handleSubmit(answer: string, hintUsed: boolean) {
    if (!item) return;
    submitAnswer.mutate(
      { itemId: item.id, answer, hintUsed },
      {
        onSuccess: (res) => {
          setResult(res);
          if (res.correct) setCorrectCount((c) => c + 1);
        },
      },
    );
  }

  function handleNext() {
    setResult(null);
    setIndex((i) => i + 1);
  }

  if (isLoading) {
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-sm text-muted-foreground">
          {isLeechDrill ? 'Loading your remedial drill…' : 'Building your quiz…'}
        </p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this quiz.</p>
        <button type="button" onClick={() => void refetch()} className="text-sm underline underline-offset-4">
          Try again
        </button>
      </main>
    );
  }

  if (done) {
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-lg font-semibold">
          {items.length === 0
            ? isLeechDrill
              ? 'No leech words right now.'
              : 'Not enough enriched words yet for a quiz.'
            : `You got ${correctCount} of ${items.length} right.`}
        </p>
        <Link href={ROUTES.home} className="text-sm underline underline-offset-4">
          Back to topics
        </Link>
      </main>
    );
  }

  return (
    <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col gap-5 p-4`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {index + 1} of {items.length} · {isLeechDrill ? 'leech drill' : 'quiz'}
        </span>
        <Link href={ROUTES.home} aria-label="End quiz">
          ✕
        </Link>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((index + 1) / items.length) * 100}%` }}
        />
      </div>

      {result ? (
        <QuizFeedback result={result} onNext={handleNext} />
      ) : (
        <QuizQuestion item={item} disabled={submitAnswer.isPending} onSubmit={handleSubmit} />
      )}
    </main>
  );
}
