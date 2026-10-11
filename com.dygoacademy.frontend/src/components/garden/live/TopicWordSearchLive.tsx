'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useStudySession } from '@/hooks/useStudySession';
import { useTopic } from '@/hooks/useTopic';
import { apiClient } from '@/lib/api-client';
import { fold } from '@/lib/search/fold';
import type { GuestWordCard } from '@/types';

import { AddWordSheet } from '../AddWordSheet';
import { useGardenPreferences } from '../preferences';
import { TopicWordSearchScreen } from '../screens/TopicWordSearchScreen';
import { bedMeanings, searchBedWords, toBedWords, type GardenTopicWord } from './data';
import { LiveError, LiveLoading } from './LiveState';
import { loadRecent, saveRecent } from './recentSearches';

/** Looks like one English word or short phrase worth a dictionary lookup. */
const ENGLISH_WORD = /^[a-z][a-z' -]{1,39}$/i;

/**
 * /topics/[id]/search: A7c from the bed's words (GET /topics/:id, the same
 * query A7 uses, so it's usually cached) and their meanings (the bed's due
 * cards, as on A7). Matching is client side, case- and accent-insensitive,
 * on the English word and the meaning. "Not in {topic} yet": when the query
 * is an English word that isn't in the bed, `GET /words/guest-lookup`
 * (cached lexicon only, never enriches) fills the dictionary line; on a
 * miss the typed word is offered only when nothing in the bed matched.
 * Plant here opens the Add word sheet with it. Recent searches (3 per bed)
 * live in localStorage.
 */
export function TopicWordSearchLive({
  topicId,
  initialQuery = '',
}: {
  topicId: string;
  initialQuery?: string;
}) {
  const t = useTranslations('screens.bed');
  const topicsT = useTranslations('screens.topics');
  const topic = useTopic(topicId);
  const { meaningLocale } = useGardenPreferences();
  const due = useStudySession(topicId, 'STANDARD', 100);
  const [query, setQuery] = useState(initialQuery);
  const [settled, setSettled] = useState(initialQuery.trim());
  const [recent, setRecent] = useState<string[]>([]);
  const [planting, setPlanting] = useState<string | null>(null);

  useEffect(() => setRecent(loadRecent(topicId)), [topicId]);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const words = topic.data
    ? toBedWords(
        topic.data.words as GardenTopicWord[],
        bedMeanings(due.data?.cards ?? [], meaningLocale),
        new Date(),
      ).words
    : [];
  const q = query.trim();
  const matches = searchBedWords(words, q);
  const lookupWord =
    ENGLISH_WORD.test(settled) && !words.some((w) => fold(w.word) === fold(settled))
      ? settled
      : '';
  const lookup = useQuery({
    queryKey: ['words', 'guest-lookup', lookupWord.toLowerCase()],
    queryFn: () =>
      apiClient.get<GuestWordCard>(`/words/guest-lookup?word=${encodeURIComponent(lookupWord)}`),
    enabled: Boolean(lookupWord),
    retry: false,
    staleTime: Infinity,
  });

  if (topic.isPending) return <LiveLoading />;
  if (topic.isError || !topic.data) {
    return <LiveError message={t('notFound')} onRetry={() => void topic.refetch()} />;
  }

  const remember = (value: string) => setRecent(saveRecent(topicId, value));
  const suggestion =
    !lookupWord || lookupWord !== q
      ? null
      : lookup.data
        ? {
            word: lookup.data.source_word,
            line:
              [lookup.data.part_of_speech, lookup.data.definition_en]
                .filter(Boolean)
                .join(topicsT('separator')) || null,
          }
        : lookup.isError && matches.length === 0
          ? { word: lookupWord, line: null }
          : null;
  const bedHref = GARDEN_ROUTES.topic(topicId);

  return (
    <>
      <TopicWordSearchScreen
        topic={topic.data.title}
        query={query}
        onQueryChange={setQuery}
        onSubmit={() => q && remember(q)}
        cancelHref={bedHref}
        matches={matches}
        hrefFor={(word) => (word.wilting ? GARDEN_ROUTES.quiz(topicId, 'leech') : bedHref)}
        onOpen={() => q && remember(q)}
        suggestion={suggestion}
        onPlant={(word) => {
          remember(word);
          setPlanting(word);
        }}
        recent={recent}
        onRecent={setQuery}
      />
      <AddWordSheet
        topicId={topicId}
        topicTitle={topic.data.title}
        open={planting !== null}
        initialWord={planting ?? undefined}
        onOpenChange={(open) => {
          if (!open) setPlanting(null);
        }}
      />
    </>
  );
}
