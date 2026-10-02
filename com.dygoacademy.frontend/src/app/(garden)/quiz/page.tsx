import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { QuizLive } from './QuizLive';

/**
 * Garden quiz (U5-5/6). `?topic=<id>` quizzes one bed; `?mode=leech` runs
 * the leech drill (`topic` then only sets where Close/Back go).
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
  const { topic, mode } = await searchParams;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  const drill = mode === 'leech' ? ('leech' as const) : undefined;
  // Keyed so switching beds or modes starts a fresh quiz.
  return (
    <QuizLive key={`${drill ?? 'quiz'}:${topicId ?? 'all'}`} topicId={topicId} mode={drill} />
  );
}
