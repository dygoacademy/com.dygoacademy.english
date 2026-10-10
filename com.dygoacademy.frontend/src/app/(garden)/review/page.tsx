import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ReviewLive } from '@/components/garden/live/ReviewLive';

/**
 * Watering (A2). `?topic=<id>` waters one bed; `?new=<n>` plants n new
 * words instead (the home screen's "Plant new words" mission); `?limit=<n>`
 * waters only the n most overdue words (A5b "Quick start"). `new` wins
 * when both are given.
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
  const { topic, new: plant, limit: first } = await searchParams;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  const plantCount = typeof plant === 'string' ? Number.parseInt(plant, 10) : NaN;
  const newWords = Number.isFinite(plantCount) ? Math.min(Math.max(plantCount, 1), 20) : undefined;
  const firstCount = typeof first === 'string' ? Number.parseInt(first, 10) : NaN;
  const limit =
    newWords === undefined && Number.isFinite(firstCount)
      ? Math.min(Math.max(firstCount, 1), 20)
      : undefined;
  // Keyed so switching beds (or watering ↔ planting, or the batch size) starts a fresh session.
  return (
    <ReviewLive
      key={`${topicId ?? 'all'}:${newWords ?? 'due'}:${limit ?? 20}`}
      topicId={topicId}
      newWords={newWords}
      limit={limit}
    />
  );
}
