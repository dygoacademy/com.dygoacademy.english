'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { ROUTES } from '@/constants/routes';
import { useStudySession } from '@/hooks/useStudySession';
import { useTopic } from '@/hooks/useTopic';

import { AddWordSheet } from '../AddWordSheet';
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
 * by next watering. Meanings come from the due cards when they carry one.
 *
 * U5-4: "Water N due" opens watering scoped to this bed
 * (/garden/review?topic=…, i.e. POST /srs/sessions with the topic); +
 * opens the garden Add word sheet (POST /words, then the bed refetches).
 * Options and Quiz still open the classic topic pages (quiz: U5-5/6).
 */
export function TopicBedLive({ topicId }: { topicId: string }) {
  const t = useTranslations('screens.bed');
  const topic = useTopic(topicId);
  const due = useStudySession(topicId, 'STANDARD', 200);
  const [adding, setAdding] = useState(false);

  if (topic.isPending) return <LiveLoading />;
  if (topic.isError || !topic.data) {
    return <LiveError message={t('notFound')} onRetry={() => void topic.refetch()} />;
  }

  const dueById = new Map((due.data?.cards ?? []).map((card) => [card.topic_word_id, card]));
  const meanings = new Map<string, string>();
  for (const [id, card] of dueById) if (card.definition_en) meanings.set(id, card.definition_en);
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
        quizHref={`${ROUTES.quiz}?topicId=${encodeURIComponent(topicId)}`}
        addWordHref={`${ROUTES.topics}/${encodeURIComponent(topicId)}`}
        onAddWord={() => setAdding(true)}
        optionsHref={`${ROUTES.topics}/${encodeURIComponent(topicId)}`}
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

