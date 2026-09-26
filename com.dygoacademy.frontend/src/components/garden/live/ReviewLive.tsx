'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useRateWord } from '@/hooks/useRateWord';
import { useStudySession } from '@/hooks/useStudySession';
import { useTopics } from '@/hooks/useTopics';
import type { DueCard, SrsRating } from '@/types';

import type { Rating } from '../RatingBar';
import { ReviewScreen } from '../screens/ReviewScreen';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden/review: watering (A2) on the existing study session.
 *
 * Real data: POST /srs/sessions (up to 20 due cards, optionally for one
 * topic) and POST /srs/rate through useRateWord (which queues offline).
 * The card list is taken once, so a background refetch can't reorder it
 * mid-session. Not available yet: interval previews (the rating buttons
 * show labels only, UI-4), CEFR level tags and meanings in the learner's
 * language. At the end, "See your garden bloom" carries this session's
 * results to /garden/review/done in the URL.
 */
export function ReviewLive({ topicId }: { topicId?: string }) {
  const t = useTranslations('screens.review');
  const live = useTranslations('screens.live');
  const session = useStudySession(topicId, 'STANDARD', 20);
  const topics = useTopics();
  const rate = useRateWord();

  const [cards, setCards] = React.useState<DueCard[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [ratings, setRatings] = React.useState<Array<{ word: string; rating: Rating }>>([]);
  const startedAt = React.useRef<number>(0);

  if (cards === null && session.data) {
    setCards(session.data.cards);
  }
  React.useEffect(() => {
    if (cards !== null && startedAt.current === 0) startedAt.current = Date.now();
  }, [cards]);

  if (cards === null) {
    if (session.isError) return <LiveError onRetry={() => void session.refetch()} />;
    return <LiveLoading />;
  }

  const total = cards.length;
  const finished = total > 0 && index >= total;
  const card = cards[Math.min(index, total - 1)];
  const topicTitle = card ? topics.data?.find((topic) => topic.id === card.topic_id)?.title : null;

  const recalled = ratings.filter((r) => r.rating === 'good' || r.rating === 'easy');
  const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60_000));
  const params = new URLSearchParams({
    watered: String(ratings.length),
    recalled: String(ratings.length ? Math.round((recalled.length / ratings.length) * 100) : 0),
    minutes: String(minutes),
  });
  if (recalled[0]) {
    params.set('word', recalled[0].word);
    params.set('more', String(recalled.length - 1));
  }

  return (
    <ReviewScreen
      state={finished ? 'finished' : revealed ? 'answer' : 'question'}
      missionTitle={live('missionTitle', { count: total })}
      done={Math.min(index, total)}
      total={Math.max(total, 1)}
      closeHref={GARDEN_ROUTES.home}
      card={
        card
          ? {
              word: card.source_word,
              ipa: card.ipa_us ?? card.ipa_uk,
              audioSrc: card.audio_url,
              level: null,
              topic: topicTitle ?? null,
              partOfSpeech: card.part_of_speech,
              meaning: card.definition_en ?? '',
              meaningTranslation: null,
              example: card.example_sentences?.[0]?.sentence ?? null,
              collocations: null,
            }
          : null
      }
      intervals={null}
      onShowAnswer={() => setRevealed(true)}
      onRate={(rating) => {
        if (!card) return;
        rate.mutate({
          topicWordId: card.topic_word_id,
          rating: rating.toUpperCase() as SrsRating,
        });
        setRatings((list) => [...list, { word: card.source_word, rating }]);
        setRevealed(false);
        setIndex((i) => i + 1);
      }}
      bloomHref={`${GARDEN_ROUTES.reviewDone}?${params.toString()}`}
      secondaryAction={{ label: t('backToGarden'), href: GARDEN_ROUTES.home }}
      emptyText={total === 0 ? t('empty') : undefined}
    />
  );
}
