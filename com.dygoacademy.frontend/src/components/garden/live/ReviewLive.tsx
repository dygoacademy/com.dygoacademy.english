'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useActiveBed, useNextSeedDrop } from '@/hooks/useBeds';
import { type TodayMissions, useTodayMissions } from '@/hooks/useMissions';
import { useRateWord } from '@/hooks/useRateWord';
import { useStudySession } from '@/hooks/useStudySession';
import { useTopics } from '@/hooks/useTopics';
import { languageOf } from '@/i18n/config';
import { forAccent, useAccent } from '@/lib/accent';
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
 * carries this session's results to /review/done in the URL, through S1
 * Fruit drops seeds first when a word turned fruit and dropped seeds
 * (GET /beds/seed-drops/next). `seedsOf` (`/review?new=…&seeds=<word>`,
 * S1 "Plant them now") plants only that fruit word's seeds.
 * (Phase 13's "Say this one?" offer was removed on 2026-10-06 for the
 * speaking entry-point redesign; The Pond is still at /sounds.)
 * With `newWords` (the "Plant new words" mission, `/review?new=<n>`) the
 * session holds only never-reviewed words, up to that many. With `limit`
 * (A5b "Quick start", `/review?limit=<n>`) it holds at most n words; the
 * API orders due words most overdue first. With `dueOnly` (A7 "Water N
 * due", `/review?topic=…&due=1`) it holds reviewed words only: the API
 * sends due words before seeds, so dropping the seeds keeps every due one.
 * Daily goal missions (2026-10-15): every session without `newWords` is
 * due-only, and the server plants at most what's left of today's Plant
 * mission; an empty planting session says why (today's seeds planted, or
 * a catch-up day with no Plant mission).
 */
export function ReviewLive({
  topicId,
  newWords,
  limit,
  dueOnly = false,
  seedsOf,
}: {
  topicId?: string;
  newWords?: number;
  limit?: number;
  dueOnly?: boolean;
  /** S1 "Plant them now": plant only the seeds this fruit topic word dropped. */
  seedsOf?: string;
}) {
  const t = useTranslations('screens.review');
  const live = useTranslations('screens.live');
  const planting = newWords !== undefined;
  const session = useStudySession(
    topicId,
    'STANDARD',
    newWords ?? limit ?? 20,
    planting,
    !planting && dueOnly,
    seedsOf,
  );
  const missions = useTodayMissions();
  const topics = useTopics();
  const rate = useRateWord();
  const [sessionOver, setSessionOver] = React.useState(false);
  const nextDrop = useNextSeedDrop(sessionOver);
  // S2: a planting session that planted the active bed's last word ends in its harvest.
  const activeBed = useActiveBed(sessionOver && planting);
  const { meaningLocale } = useGardenPreferences();

  const [cards, setCards] = React.useState<DueCard[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [ratings, setRatings] = React.useState<Array<{ word: string; rating: Rating }>>([]);
  const startedAt = React.useRef<number>(0);
  // The profile's English (Me → English) picks each card's IPA and clip.
  const accent = useAccent();

  if (cards === null && session.data) {
    // A planting session shows new words only, whatever the server sends;
    // a due-only one shows no new words.
    const all = session.data.cards;
    setCards(planting ? all.filter((c) => c.is_new) : dueOnly ? all.filter((c) => !c.is_new) : all);
  }
  React.useEffect(() => {
    if (cards !== null && startedAt.current === 0) startedAt.current = Date.now();
  }, [cards]);
  // Warm the phone's media cache with the next few cards' audio, so the
  // speaker button plays at once on slow networks (option 2, lib/media-cache).
  React.useEffect(() => {
    if (cards) void prefetchMedia(cards.slice(index, index + 3).map((c) => forAccent(c, accent).audioSrc));
  }, [cards, index, accent]);

  if (cards === null) {
    if (session.isError) return <LiveError onRetry={() => void session.refetch()} />;
    return <LiveLoading />;
  }

  const total = cards.length;
  const finished = total > 0 && index >= total;
  if (finished && !sessionOver) setSessionOver(true);
  const card = cards[Math.min(index, total - 1)];
  const topicTitle = card ? topics.data?.find((topic) => topic.id === card.topic_id)?.title : null;

  // Seeds & Harvest S1: a word that turned fruit this session dropped seeds;
  // show them before Mission complete. Ratings invalidate ['srs'], so the
  // last card's drop is picked up once its rating lands.
  const drop = nextDrop.data;

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

  if (planting) params.set('planted', '1');
  const doneHref = `${GARDEN_ROUTES.reviewDone}?${params.toString()}`;

  return (
    <>
      <ReviewScreen
        state={finished ? 'finished' : revealed ? 'answer' : 'question'}
        missionTitle={live(planting ? 'plantTitle' : 'missionTitle', { count: total })}
        done={Math.min(index, total)}
        total={Math.max(total, 1)}
        closeHref={GARDEN_ROUTES.home}
        card={
          card
            ? {
                word: card.source_word,
                ...forAccent(card, accent),
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
        bloomHref={
          drop
            ? GARDEN_ROUTES.seedDrop(drop.bed.topic_id, drop.dropped_by.topic_word_id, doneHref)
            : planting && activeBed.data?.harvest_ready
              ? GARDEN_ROUTES.bedHarvest(activeBed.data.topic_id)
              : doneHref
        }
        secondaryAction={{ label: t('backToGarden'), href: GARDEN_ROUTES.home }}
        emptyText={total === 0 ? t(planting ? emptyPlantKey(missions.data) : 'empty') : undefined}
      />
    </>
  );
}

/** Why a planting session came back empty (daily goal missions). */
function emptyPlantKey(
  today: TodayMissions | undefined,
): 'emptyPlant' | 'emptyPlantDone' | 'emptyPlantCatchUp' {
  if (!today || today.missions.length === 0) return 'emptyPlant';
  const plant = today.missions.find((m) => m.type === 'LEARN_NEW');
  if (!plant) return 'emptyPlantCatchUp';
  return plant.done ? 'emptyPlantDone' : 'emptyPlant';
}
