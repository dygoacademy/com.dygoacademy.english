import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { PronounceLive } from '@/components/garden/live/PronounceLive';
import { GARDEN_ROUTES } from '@/constants/garden';

/**
 * Pronunciation "Stepping stones" (P1–P4, 2026-10-11): say every word
 * asked for, one at a time ("Say all" runs a bed's bees in a row,
 * pronunciation v2; there's no cap of three any more). `?words=<topic word id>,…` (from "Bees are
 * waiting" on a bed), `?topic=<id>` names the bed in the iPad header,
 * `?back=<path>` is where Close goes (an app path only).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.pronounce');
  return { title: t('eyebrow') };
}

export default async function PronouncePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { words, topic, back } = await searchParams;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  // Only a path in this app: never another site (open redirect).
  const backHref =
    typeof back === 'string' && back.startsWith('/') && !back.startsWith('//') && !back.startsWith('/\\') ? back : undefined;
  const wordIds =
    typeof words === 'string' ? words.split(',').filter(Boolean) : [];
  const closeHref = backHref ?? (topicId ? GARDEN_ROUTES.topic(topicId) : GARDEN_ROUTES.topics);
  if (wordIds.length === 0) redirect(closeHref);
  return (
    <PronounceLive key={wordIds.join(',')} wordIds={wordIds} topicId={topicId} closeHref={closeHref} />
  );
}
