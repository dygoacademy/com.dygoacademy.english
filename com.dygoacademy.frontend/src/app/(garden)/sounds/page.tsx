import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SpeakLive } from '@/components/garden/live/SpeakLive';
import { SPEAK_NOTICES, type SpeakNoticeKind } from '@/lib/speaking/constants';

/**
 * Phase 13 Sound Garden → The Pond (notes §14). `?topic=<id>` limits it to
 * one bed's words. Dev toggle (T7): `?state=mic|denied|quiet|short|
 * unsupported|audioFailed` opens SP1 showing that state, so each one can be
 * checked on a phone; it changes nothing else.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.speak.soundGarden');
  return { title: t('pond') };
}

export default async function SoundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { topic, state } = await searchParams;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  const forceNotice = SPEAK_NOTICES.find((kind) => kind === state) as SpeakNoticeKind | undefined;
  return (
    <SpeakLive
      key={`${topicId ?? 'all'}:${forceNotice ?? ''}`}
      topicId={topicId}
      forceNotice={forceNotice}
    />
  );
}
