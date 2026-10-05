'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useRateWord } from '@/hooks/useRateWord';
import { useStudySession } from '@/hooks/useStudySession';
import { useTopics } from '@/hooks/useTopics';
import { languageOf } from '@/i18n/config';
import { prefetchMedia } from '@/lib/media-cache';
import type { DueCard, RatingInterval, SrsRating } from '@/types';

import { useGardenPreferences } from '../preferences';
import type { Rating } from '../RatingBar';
import { ReviewScreen } from '../screens/ReviewScreen';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /review: watering (A2) on the existing study session.
 *
 * Real data: POST /srs/sessions (up to 20 due cards, optionally for one
 * topic) and POST /srs/rate through useRateWord (which queues offline).
 * The card list is taken once, so a background refetch can't reorder it
 * mid-session. CEFR level tags not yet available. The meaning-language line
 * (design system §14.8) now comes from `card.meaning_translation`
 * (`word_translations`, joined server-side by `profiles.meaning_locale`);
 * it's simply absent for a word Gemini hasn't translated yet. Synonyms
 * come from the card's `synonyms`. At the end, "See your garden bloom"
 * carries this session's results to /review/done in the URL.
 * (Phase 13's "Say this one?" offer was removed on 2026-10-06 for the
 * speaking entry-point redesign; The Pond is still at /sounds.)
 */
export function ReviewLive({ topicId }: { topicId?: string }) {
  const t = useTranslations('screens.review');
  const live = useTranslations('screens.live');
  const session = useStudySession(topicId, 'STANDARD', 20);
  const topics = useTopics();
  const rate = useRateWord();
  const { meaningLocale } = useGardenPreferences();

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
  // Warm the phone's media cache with the next few cards' audio, so the
  // speaker button plays at once on slow networks (option 2, lib/media-cache).
  React.useEffect(() => {
    if (cards) void prefetchMedia(cards.slice(index, index + 3).map((c) => c.audio_url));
  }, [cards, index]);

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
    <>
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
                meaningTranslation: card.meaning_translation
                  ? {
                      text: card.meaning_translation,
                      lang: languageOf(card.meaning_locale ?? 'en'),
                    }
                  : null,
                meaningFirst: meaningLocale !== null,
                example: card.example_sentences?.[0]?.sentence ?? null,
                collocations: null,
                synonyms: card.synonyms?.map((synonym) => synonym.word).filter(Boolean) ?? null,
              }
            : null
        }
        intervals={
          card && card.interval_preview
            ? {
                again: card.interval_preview.AGAIN,
                hard: card.interval_preview.HARD,
                good: card.interval_preview.GOOD,
                easy: card.interval_preview.EASY,
              }
            : null
        }
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
    </>
  );
}
