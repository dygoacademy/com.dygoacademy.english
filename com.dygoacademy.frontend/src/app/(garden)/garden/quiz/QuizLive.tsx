'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { buttonClassName } from '@/components/garden/buttonStyles';
import { LiveError, LiveLoading } from '@/components/garden/live/LiveState';
import { QuizScreen } from '@/components/garden/screens/QuizScreen';
import { GARDEN_ROUTES } from '@/constants/garden';
import { useGenerateQuiz } from '@/hooks/useGenerateQuiz';
import { useQuizHint } from '@/hooks/useQuizHint';
import { useSubmitQuizAnswer } from '@/hooks/useSubmitQuizAnswer';
import { useTopics } from '@/hooks/useTopics';
import { formatIpa } from '@/lib/utils';
import type { QuizAnswerResult, QuizItem } from '@/types';

import { toFeedback } from './feedback';

/**
 * /garden/quiz?topic=<id>: the garden quiz, part 1 (U5-5), on the same
 * endpoints as the classic quiz: POST /quizzes/generate (10 items, scoped
 * to the topic), POST /quizzes/:id/answer, GET /quizzes/:id/hint (TEXT
 * items only). The item list is taken once so a refetch can't reorder it
 * mid-quiz; the hint resets per question.
 *
 * The finished state here is a plain score line with "Back to bed"; the
 * real result screen (words that need water, leech drill) is U5-6.
 */
export function QuizLive({ topicId }: { topicId?: string }) {
  const t = useTranslations('screens.quiz');
  const generated = useGenerateQuiz(topicId, undefined, undefined, 10);
  const topics = useTopics();
  const submit = useSubmitQuizAnswer();
  const hint = useQuizHint();

  const [items, setItems] = React.useState<QuizItem[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [result, setResult] = React.useState<QuizAnswerResult | null>(null);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

  if (items === null && generated.data) {
    setItems(generated.data);
  }

  const closeHref = topicId ? GARDEN_ROUTES.topic(topicId) : GARDEN_ROUTES.topics;

  if (items === null) {
    if (generated.isError) return <LiveError onRetry={() => void generated.refetch()} />;
    return <LiveLoading />;
  }

  if (items.length === 0 || index >= items.length) {
    return (
      <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col items-center justify-center gap-[18px] bg-garden-bg px-6 text-center text-garden-text">
        <p className="font-display text-[24px] font-semibold">
          {items.length === 0
            ? t('empty')
            : t('doneTitle', { correct: correctCount, total: items.length })}
        </p>
        <Link href={closeHref} className={buttonClassName('primary', { className: 'w-full' })}>
          {topicId ? t('backToBed') : t('backToTopics')}
        </Link>
      </div>
    );
  }

  const item = items[index];
  const topicTitle = topics.data?.find((topic) => topic.id === item.topicId)?.title ?? null;
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
      { itemId: item.id, answer, hintUsed: hint.data != null },
      {
        onSuccess: (res) => {
          setResult(res);
          if (res.correct) setCorrectCount((c) => c + 1);
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
      isLast={index === items.length - 1}
    />
  );
}
