import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { TopicsLive } from '@/components/garden/live/TopicsLive';

/** Topics, the garden beds (A6). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('topics') };
}

export default function GardenTopicsPage() {
  return <TopicsLive />;
}
