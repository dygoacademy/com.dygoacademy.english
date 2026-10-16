import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { QuizLive } from './QuizLive';

/**
 * Garden quiz (U5-5/6). `?topic=<id>` quizzes one bed; `?mode=leech` runs
 * the leech drill (`topic` then only sets where Close/Back go); `?n=<count>`
 * sets the number of questions (5–20, default 10: the QUIZ mission's length
 * from the daily goal).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('quiz') };
}

export default async function GardenQuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { topic, mode, n } = await searchParams;
  const count = typeof n === 'string' ? Number.parseInt(n, 10) : NaN;
  const questions = Number.isFinite(count) ? Math.min(Math.max(count, 5), 20) : undefined;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  const drill = mode === 'leech' ? ('leech' as const) : undefined;
  // Keyed so switching beds or modes starts a fresh quiz.
  return (
    <QuizLive
      key={`${drill ?? 'quiz'}:${topicId ?? 'all'}:${questions ?? 10}`}
      topicId={topicId}
      mode={drill}
      questions={questions}
    />
  );
}
