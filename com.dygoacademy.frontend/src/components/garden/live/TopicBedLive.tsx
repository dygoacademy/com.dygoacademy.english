'use client';

import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { ROUTES } from '@/constants/routes';
import { useStudySession } from '@/hooks/useStudySession';
import { useTopic } from '@/hooks/useTopic';

import { TopicBedScreen, type TopicBedWord } from '../screens/TopicBedScreen';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden/topics/[id]: a topic bed (A7) from GET /topics/:id and the
 * topic's due cards (POST /srs/sessions with the topic).
 *
 * Real: the words, which are due now or new, and their meanings when the
 * due card carries one. Not available yet (UI-5): each word's plant stage
 * and next watering date, so the stage tiles show "—" and can't filter,
 * new words are seeds, due words sprouts, and the others show no date.
 * Quiz, Add word and Options open the classic topic pages.
 */
export function TopicBedLive({ topicId }: { topicId: string }) {
  const t = useTranslations('screens.bed');
  const topic = useTopic(topicId);
  const due = useStudySession(topicId, 'STANDARD', 200);

  if (topic.isPending) return <LiveLoading />;
  if (topic.isError || !topic.data) {
    return <LiveError message={t('notFound')} onRetry={() => void topic.refetch()} />;
  }

  const dueById = new Map((due.data?.cards ?? []).map((card) => [card.topic_word_id, card]));
  const words: TopicBedWord[] = topic.data.words
    .map((word) => {
      const card = dueById.get(word.id);
      const isNew = card?.is_new ?? false;
      return {
        id: word.id,
        word: word.source_word,
        meaning: card?.definition_en ?? word.custom_note ?? '',
        stage: isNew ? ('seed' as const) : ('sprout' as const),
        wilting: card?.is_leech ?? false,
        due: card
          ? isNew
            ? ({ tone: 'new' } as const)
            : ({ tone: 'now' } as const)
          : ({ tone: 'later', days: null } as const),
      };
    })
    // Due first (wilting, then due, then new), like "Sorted by next watering".
    .sort((a, b) => rank(a) - rank(b));
  const dueCount = [...dueById.values()].length;

  return (
    <TopicBedScreen
      title={topic.data.title}
      meta={{ collection: null, level: null, words: topic.data.words.length }}
      backHref={GARDEN_ROUTES.topics}
      stageCounts={null}
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
      optionsHref={`${ROUTES.topics}/${encodeURIComponent(topicId)}`}
    />
  );
}

function rank(word: TopicBedWord): number {
  if (word.wilting) return 0;
  if (word.due.tone === 'now') return 1;
  if (word.due.tone === 'new') return 2;
  return 3;
}
