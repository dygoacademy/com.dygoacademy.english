'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { QuizAwards } from '@/components/quiz/QuizAwards';
import { QuizFeedback } from '@/components/quiz/QuizFeedback';
import { QuizQuestion } from '@/components/quiz/QuizQuestion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CONTENT_WIDTH } from '@/constants/layout';
import { REQUIZ_STORAGE_KEY, ROUTES } from '@/constants/routes';
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
 * Three entry points share this one page: `?topicId=` (FR-5.1–5.4, a normal
 * quiz batch via `POST /quizzes/generate`), `?mode=leech` (FR-3.3's
 * remedial drill via `GET /quizzes/leech-drill`), and `?mode=requiz`
 * (Phase 9, "Targeted Re-Quiz" — the exact words just missed in a study
 * session, via the same `POST /quizzes/generate` as topicId but with
 * `topicWordIds` instead). Both quiz-generating hooks are called
 * unconditionally — see `useGenerateQuiz`'s comment — with `enabled`
 * deciding which one actually fetches, so only one network call happens
 * per visit regardless of which mode this is. `requiz`'s word-id list
 * arrives via `sessionStorage` (`study/page.tsx`'s `REQUIZ_STORAGE_KEY`),
 * not the URL — read once on mount, see the `useEffect` below.
 *
 * `max-w-xs` -> `max-w-sm` on every screen state here -- live-reported
 * 2026-09-05 ("the quiz and flash card screen too small"), matching
 * `/study`'s same-day width bump. Widened again to `max-w-md` the same
 * day ("the page quiz should have more space of width") -- `/study`
 * stayed at `max-w-sm` since only the quiz page's own testing flagged it.
 *
 * The × exit control gained a confirm 2026-09-19 (Phase 2 FR-12.1 --
 * audit finding: it was a plain `Link`, silently discarding an
 * in-progress quiz with no warning). Picked the smaller-lift option the
 * implementation plan offered (confirm dialog) over persisting/resuming
 * session state, which the plan flagged as the better long-term UX but
 * bigger scope. `answeredAny` gates it: exiting before answering anything
 * has nothing to lose, so that case still navigates straight through.
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topicId') ?? undefined;
  const isLeechDrill = searchParams.get('mode') === 'leech';
  const isRequiz = searchParams.get('mode') === 'requiz';

  // Phase 9, "Targeted Re-Quiz" -- read once on mount, not during render
  // (sessionStorage doesn't exist during SSR, same hydration-mismatch
  // reasoning as Topics as Collections' `localStorage` read). `undefined`
  // means "haven't read it yet"; `[]` means "read it, and it was empty or
  // missing" -- the two are kept distinct so `enabled` below doesn't fire
  // the query on a false-empty read before the effect has even run.
  const [requizWordIds, setRequizWordIds] = useState<string[] | undefined>(undefined);
  useEffect(() => {
    if (!isRequiz) return;
    const stored = window.sessionStorage.getItem(REQUIZ_STORAGE_KEY);
    try {
      const parsed = stored ? JSON.parse(stored) : [];
      setRequizWordIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRequizWordIds([]);
    }
  }, [isRequiz]);

  const generated = useGenerateQuiz(
    isRequiz ? undefined : topicId,
    isRequiz ? requizWordIds : undefined,
    undefined,
    10,
    // Don't fire while requiz's sessionStorage read is still pending, and
    // don't fire at all if it resolved empty -- an empty `topicWordIds`
    // isn't "no scope" server-side, it's "zero words," which would
    // otherwise silently fall through to a full unscoped quiz instead of
    // an honest "nothing to quiz" state.
    !isLeechDrill && (!isRequiz || (requizWordIds?.length ?? 0) > 0),
  );
  const leechDrill = useLeechDrillQuiz(isLeechDrill);
  const { data, isLoading, isError, refetch } = isLeechDrill ? leechDrill : generated;

  const submitAnswer = useSubmitQuizAnswer();
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  // Same pattern as `study/page.tsx`'s own `missedWordIds` -- a separate
  // array, not folded into `correctCount`, since "Review N missed words"
  // (QuizAwards) needs to know *which* words, not just how many.
  const [missedWordIds, setMissedWordIds] = useState<string[]>([]);
  // FR-12.1 -- once true, stays true for the rest of the session; used only
  // to decide whether leaving needs a confirm, not anything scored.
  const [answeredAny, setAnsweredAny] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

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
          setAnsweredAny(true);
          if (res.correct) {
            setCorrectCount((c) => c + 1);
          } else {
            setMissedWordIds((ids) => [...ids, item.topicWordId]);
          }
        },
      },
    );
  }

  function handleNext() {
    setResult(null);
    setIndex((i) => i + 1);
  }

  // FR-12.1 -- the × used to be a plain Link, silently discarding an
  // in-progress quiz. Exiting before anything's been answered has nothing
  // to lose, so that case still navigates immediately; once at least one
  // question has been submitted, this asks first instead.
  function handleExitClick() {
    if (answeredAny) {
      setConfirmExitOpen(true);
    } else {
      router.push(ROUTES.home);
    }
  }

  // Requiz's query is deliberately `enabled: false` while its
  // sessionStorage read is pending or resolves empty (see the comment on
  // `generated` above) -- react-query's own `isLoading` never resolves
  // for a disabled query, so both cases are handled explicitly here
  // rather than falling into the generic isLoading/done checks below.
  if (isRequiz && requizWordIds === undefined) {
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-sm text-muted-foreground">Building your quiz…</p>
      </main>
    );
  }
  if (isRequiz && requizWordIds?.length === 0) {
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-lg font-semibold">Nothing to quiz.</p>
        <p className="text-sm text-muted-foreground">
          No missed words came through from that session.
        </p>
        <Link href={ROUTES.home} className="text-sm underline underline-offset-4">
          Back to topics
        </Link>
      </main>
    );
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

  // A genuine completed quiz gets the awards screen (QuizAwards); the
  // zero-item edge cases below stay plain text -- there's nothing to
  // celebrate about a quiz that never had any questions.
  if (done && items.length === 0) {
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-lg font-semibold">
          {isLeechDrill
            ? 'No leech words right now.'
            : isRequiz
              ? "Those words aren't quizzable right now."
              : 'Not enough enriched words yet for a quiz.'}
        </p>
        <Link href={ROUTES.home} className="text-sm underline underline-offset-4">
          Back to topics
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center p-4`}>
        <QuizAwards correctCount={correctCount} totalCount={items.length} missedWordIds={missedWordIds} />
      </main>
    );
  }

  return (
    <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col gap-5 p-4`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {index + 1} of {items.length} ·{' '}
          {isLeechDrill ? 'leech drill' : isRequiz ? 're-quiz' : 'quiz'}
        </span>
        <button type="button" onClick={handleExitClick} aria-label="End quiz">
          ✕
        </button>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((index + 1) / items.length) * 100}%` }}
        />
      </div>

      {/* QuizQuestion stays mounted through the answered state now (Phase 2
          FR-12.2) instead of being swapped out for QuizFeedback -- `key`
          forces a fresh instance (and fresh internal selectedOption/text
          state) per question, same reset `handleNext`'s old unmount used
          to give it for free. */}
      <QuizQuestion
        key={item.id}
        item={item}
        disabled={submitAnswer.isPending}
        result={result}
        onSubmit={handleSubmit}
      />
      {result && <QuizFeedback result={result} onNext={handleNext} />}

      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this {isLeechDrill ? 'drill' : 'quiz'}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve answered {index + (result ? 1 : 0)} of {items.length}. Your progress on
              this session won&apos;t be saved if you leave now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(ROUTES.home)}>
              End {isLeechDrill ? 'drill' : 'quiz'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
