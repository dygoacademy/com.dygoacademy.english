import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { TopicBedLive } from '@/components/garden/live/TopicBedLive';

/** A topic bed (A7). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('topic') };
}

export default async function GardenTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TopicBedLive topicId={id} />;
}
