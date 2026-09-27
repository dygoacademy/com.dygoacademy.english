import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { QuizLive } from './QuizLive';

/** Garden quiz (U5-5). `?topic=<id>` quizzes one bed. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('quiz') };
}

export default async function GardenQuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { topic } = await searchParams;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  // Keyed so switching beds starts a fresh quiz.
  return <QuizLive key={topicId ?? 'all'} topicId={topicId} />;
}
