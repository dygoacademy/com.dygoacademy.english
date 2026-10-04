import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SpeakLive } from '@/components/garden/live/SpeakLive';

/** Phase 13 Sound Garden → The Pond (notes §14). `?topic=<id>` limits it to one bed's words. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.speak.soundGarden');
  return { title: t('pond') };
}

export default async function SoundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { topic } = await searchParams;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  return <SpeakLive key={topicId ?? 'all'} topicId={topicId} />;
}
