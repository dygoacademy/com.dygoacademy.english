import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SpeakLive } from '@/components/garden/live/SpeakLive';
import { SpeakWordsLive } from '@/components/garden/live/SpeakWordsLive';
import { GARDEN_ROUTES } from '@/constants/garden';
import { SPEAK_NOTICES, type SpeakNoticeKind } from '@/lib/speaking/constants';

/**
 * Phase 13 The Pond. Entry points (2026-10-06 redesign): the Home SPEAK
 * mission (SE1), a bed's Speak row (SE2, `?topic=<id>`: that bed's words),
 * "Bees are waiting" (was SE5, `?word=<topic word id>&harvest=1`; "Say
 * all": `?words=<id>,<id>&harvest=1`) and the Echo
 * challenge (SE6, `?word=`). `?back=<path>` is where Close goes (an app
 * path only). Dev toggle (T7): `?state=mic|denied|quiet|short|
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
  const { topic, word, words, harvest, back, state } = await searchParams;
  const topicId = typeof topic === 'string' && topic ? topic : undefined;
  const wordId = typeof word === 'string' && word ? word : undefined;
  // Only a path in this app: never another site (open redirect).
  const backHref =
    typeof back === 'string' && back.startsWith('/') && !back.startsWith('//') && !back.startsWith('/\\') ? back : undefined;
  const forceNotice = SPEAK_NOTICES.find((kind) => kind === state) as SpeakNoticeKind | undefined;
  const wordIds = typeof words === 'string' ? words.split(',').filter(Boolean).slice(0, 5) : [];
  if (wordIds.length > 0) {
    return (
      <SpeakWordsLive
        key={wordIds.join(',')}
        wordIds={wordIds}
        harvest={harvest === '1'}
        closeHref={backHref ?? (topicId ? GARDEN_ROUTES.topic(topicId) : GARDEN_ROUTES.missions)}
        forceNotice={forceNotice}
      />
    );
  }
  return (
    <SpeakLive
      key={`${topicId ?? 'all'}:${wordId ?? ''}:${forceNotice ?? ''}`}
      topicId={topicId}
      wordId={wordId}
      harvest={harvest === '1'}
      backHref={backHref}
      forceNotice={forceNotice}
    />
  );
}
