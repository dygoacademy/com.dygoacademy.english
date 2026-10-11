import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { TopicWordSearchLive } from '@/components/garden/live/TopicWordSearchLive';

/** A7c: search a topic bed's words (`?q=` prefills the field). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('topic') };
}

export default async function GardenTopicSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  return <TopicWordSearchLive topicId={id} initialQuery={typeof q === 'string' ? q : ''} />;
}
