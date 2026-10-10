import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ReviewLive } from '@/components/garden/live/ReviewLive';

/**
 * Watering (A2). `?topic=<id>` waters one bed; `?new=<n>` plants n new
 * words instead (the home screen's "Plant new words" mission).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('review') };
}

export default async function GardenReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { topic, new: plant } = await searchParams;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  const plantCount = typeof plant === 'string' ? Number.parseInt(plant, 10) : NaN;
  const newWords = Number.isFinite(plantCount) ? Math.min(Math.max(plantCount, 1), 20) : undefined;
  // Keyed so switching beds (or watering ↔ planting) starts a fresh session.
  return (
    <ReviewLive
      key={`${topicId ?? 'all'}:${newWords ?? 'due'}`}
      topicId={topicId}
      newWords={newWords}
    />
  );
}
