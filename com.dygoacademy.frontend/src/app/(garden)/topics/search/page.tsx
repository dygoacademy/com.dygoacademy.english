import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { TopicSearchLive } from '@/components/garden/live/TopicSearchLive';

/** A6b: search topics. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('topics') };
}

export default function GardenTopicsSearchPage() {
  return <TopicSearchLive />;
}
