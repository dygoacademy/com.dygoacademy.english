'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { buttonClassName } from '@/components/garden/buttonStyles';
import { LiveError, LiveLoading } from '@/components/garden/live/LiveState';
import { QuizResultScreen } from '@/components/garden/screens/QuizResultScreen';
import { QuizScreen } from '@/components/garden/screens/QuizScreen';
import { GARDEN_ROUTES } from '@/constants/garden';
import { useGenerateQuiz } from '@/hooks/useGenerateQuiz';
import { useLeechDrillQuiz } from '@/hooks/useLeechDrillQuiz';
import { useQuizHint } from '@/hooks/useQuizHint';
import { useSubmitQuizAnswer } from '@/hooks/useSubmitQuizAnswer';
import { useTopics } from '@/hooks/useTopics';
import { formatIpa } from '@/lib/utils';
import type { QuizAnswerResult, QuizItem } from '@/types';

import { toFeedback } from './feedback';
import { addMissed, type MissedWord } from './results';

/**
 * /quiz?topic=<id>: the garden quiz, part 1 (U5-5), on the same
 * endpoints as the classic quiz: POST /quizzes/generate (10 items, scoped
 * to the topic), POST /quizzes/:id/answer, GET /quizzes/:id/hint (TEXT
 * items only; the answer carries the app language so a wrong answer's
 * explanation comes back in it). The item list is taken once so a refetch can't reorder it
 * mid-quiz; the hint resets per question. The last answer is sent with
 * `final: true`, which completes the day's QUIZ mission (2026-10-07: it
 * was never sent, so the mission could not be done).
 *
 * U5-6: when every item is answered, QuizResultScreen shows the score,
 * the missed words ("need water") and "Back to bed". `mode="leech"`
 * (`?mode=leech`, reached from A7's wilting rows) runs the leech drill
 * instead: GET /quizzes/leech-drill (all of the learner's leeches, not
 * scoped to the bed), same question and result screens; `topicId` then
 * only decides where Close and Back go.
 *
 * QZ-4: a normal quiz with misses links "Drill tricky words" to that
 * drill (`?topic=<id>&mode=leech`, so it comes back to the same bed).
 */
export function QuizLive({
  topicId,
  mode,
  questions = 10,
}: {
  topicId?: string;
  mode?: 'leech';
  /** Questions in a normal quiz (`?n=`, the QUIZ mission's length). */
  questions?: number;
}) {
  const t = useTranslations('screens.quiz');
  const locale = useLocale();
  const isDrill = mode === 'leech';
  const generated = useGenerateQuiz(topicId, undefined, undefined, questions, !isDrill);
  const drill = useLeechDrillQuiz(isDrill);
  const source = isDrill ? drill : generated;
  const topics = useTopics();
  const submit = useSubmitQuizAnswer();
  const hint = useQuizHint();

  const [items, setItems] = React.useState<QuizItem[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [result, setResult] = React.useState<QuizAnswerResult | null>(null);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [missed, setMissed] = React.useState<MissedWord[]>([]);
  const [failed, setFailed] = React.useState(false);

  if (items === null && source.data) {
    setItems(source.data);
  }

  const closeHref = topicId ? GARDEN_ROUTES.topic(topicId) : GARDEN_ROUTES.topics;

  if (items === null) {
    if (source.isError) return <LiveError onRetry={() => void source.refetch()} />;
    return <LiveLoading />;
  }

  if (items.length > 0 && index >= items.length) {
    return (
      <QuizResultScreen
        closeHref={closeHref}
        backHref={closeHref}
        back={topicId ? 'bed' : 'topics'}
        correct={correctCount}
        total={items.length}
        missed={missed}
        drill={isDrill}
        drillHref={isDrill ? null : GARDEN_ROUTES.quiz(topicId, 'leech')}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col items-center justify-center gap-[18px] bg-bg px-6 text-center text-text">
        <p className="font-display text-[24px] font-semibold">
          {isDrill ? t('emptyDrill') : t('empty')}
        </p>
        <Link href={closeHref} className={buttonClassName('primary', { className: 'w-full' })}>
          {topicId ? t('backToBed') : t('backToTopics')}
        </Link>
      </div>
    );
  }

  const item = items[index];
  const isLast = index === items.length - 1;
  const topicTitle = isDrill
    ? t('drillTitle')
    : (topics.data?.find((topic) => topic.id === item.topicId)?.title ?? null);
  const hintState = hint.data
    ? {
        status: 'shown' as const,
        ipa: formatIpa(hint.data.ipaUs) || null,
        definition: hint.data.definition,
      }
    : { status: hint.isPending ? ('loading' as const) : ('idle' as const) };

  function handleSubmit(answer: string) {
    setFailed(false);
    submit.mutate(
      {
        itemId: item.id,
        answer,
        hintUsed: hint.data != null,
        locale,
        final: isLast,
        drill: isDrill,
      },
      {
        onSuccess: (res) => {
          setResult(res);
          if (res.correct) setCorrectCount((c) => c + 1);
          else setMissed((list) => addMissed(list, item.topicWordId, res.word));
        },
        onError: () => setFailed(true),
      },
    );
  }

  function handleNext() {
    setResult(null);
    setFailed(false);
    hint.reset();
    setIndex((i) => i + 1);
  }

  return (
    <QuizScreen
      topicTitle={topicTitle}
      index={index}
      total={items.length}
      closeHref={closeHref}
      question={item}
      feedback={result ? toFeedback(result) : null}
      hint={hintState}
      onHint={() => hint.mutate(item.id)}
      onSubmit={handleSubmit}
      onNext={handleNext}
      submitting={submit.isPending}
      errorText={failed ? t('error') : null}
      isLast={isLast}
    />
  );
}
