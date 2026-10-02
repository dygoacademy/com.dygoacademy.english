'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useStudySession } from '@/hooks/useStudySession';
import { useTopic } from '@/hooks/useTopic';
import { languageOf } from '@/i18n/config';

import { AddWordSheet } from '../AddWordSheet';
import { useGardenPreferences } from '../preferences';
import { TopicBedScreen } from '../screens/TopicBedScreen';
import { toBedWords, type GardenTopicWord } from './data';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden/topics/[id]: a topic bed (A7) from GET /topics/:id and the
 * topic's due cards (POST /srs/sessions with the topic).
 *
 * U5-3: each word's plant stage, wilting and next watering come from the
 * caller's SRS state on GET /topics/:id (U5-1) via `toBedWords`, so the
 * stage tiles show real counts and filter the list, and words are sorted
 * by next watering. Meanings come from the due cards when they carry one:
 * the learner's meaning-language translation when `meaningLocale` is set
 * and that card has one (same source as the review card, design system
 * §14.8), English `definition_en` otherwise (2026-09-29 — previously
 * always English, ignoring the meaning-language preference).
 *
 * U5-4: "Water N due" opens watering scoped to this bed
 * (/garden/review?topic=…, i.e. POST /srs/sessions with the topic); +
 * opens the garden Add word sheet (POST /words, then the bed refetches).
 * Options still opens the classic topic page.
 *
 * U5-6: Quiz opens the garden quiz for this bed (/garden/quiz?topic=…),
 * and wilting rows open the leech drill (…&mode=leech), which comes back
 * to this bed.
 */
export function TopicBedLive({ topicId }: { topicId: string }) {
  const t = useTranslations('screens.bed');
  const topic = useTopic(topicId);
  const { meaningLocale } = useGardenPreferences();
  // 100 is the API's cap (StartSessionDto @Max(100)); 200 was a 400, so the
  // bed never showed "Water N due".
  const due = useStudySession(topicId, 'STANDARD', 100);
  const [adding, setAdding] = useState(false);

  if (topic.isPending) return <LiveLoading />;
  if (topic.isError || !topic.data) {
    return <LiveError message={t('notFound')} onRetry={() => void topic.refetch()} />;
  }

  const dueById = new Map((due.data?.cards ?? []).map((card) => [card.topic_word_id, card]));
  const meanings = new Map<string, { text: string; lang?: string }>();
  for (const [id, card] of dueById) {
    if (meaningLocale && card.meaning_translation) {
      meanings.set(id, { text: card.meaning_translation, lang: languageOf(card.meaning_locale ?? meaningLocale) });
    } else if (card.definition_en) {
      meanings.set(id, { text: card.definition_en, lang: 'en' });
    }
  }
  const { words, stageCounts } = toBedWords(
    topic.data.words as GardenTopicWord[],
    meanings,
    new Date(),
  );
  const dueCount = [...dueById.values()].length;

  return (
    <>
      <TopicBedScreen
        title={topic.data.title}
        meta={{ collection: null, level: null, words: topic.data.words.length }}
        backHref={GARDEN_ROUTES.topics}
        stageCounts={stageCounts}
        words={words}
        water={
          dueCount > 0
            ? {
                count: dueCount,
                href: `${GARDEN_ROUTES.review}?topic=${encodeURIComponent(topicId)}`,
              }
            : null
        }
        quizHref={GARDEN_ROUTES.quiz(topicId)}
        addWordHref={GARDEN_ROUTES.topic(topicId)}
        onAddWord={() => setAdding(true)}
        wiltingHref={GARDEN_ROUTES.quiz(topicId, 'leech')}
      />
      <AddWordSheet
        topicId={topicId}
        topicTitle={topic.data.title}
        open={adding}
        onOpenChange={setAdding}
      />
    </>
  );
}

