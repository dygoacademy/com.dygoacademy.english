import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ReviewLive } from '@/components/garden/live/ReviewLive';

/** Watering (A2). `?topic=<id>` waters one bed. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('review') };
}

export default async function GardenReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { topic } = await searchParams;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  // Keyed so switching beds starts a fresh session.
  return <ReviewLive key={topicId ?? 'all'} topicId={topicId} />;
}
