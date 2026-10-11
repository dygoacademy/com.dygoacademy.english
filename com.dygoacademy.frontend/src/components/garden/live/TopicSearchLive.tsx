'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useTopics } from '@/hooks/useTopics';
import type { TopicDetail } from '@/types';

import { TopicSearchScreen } from '../screens/TopicSearchScreen';
import { findWordInBeds, searchTopics, toSearchTopics, type GardenTopicSummary } from './data';
import { LiveError, LiveLoading } from './LiveState';
import { loadRecent, saveRecent } from './recentSearches';

/** How many new words Plant sows from a library topic (as A1b's extra). */
const PLANT_COUNT = 5;

/**
 * /topics/search: A6b from GET /topics (the same query as A6). Matches the
 * title, the library collection and the CEFR range. GET /topics already
 * returns the public library topics, which the learner waters in place
 * (no copy), so "More topics to plant" = library topics with nothing
 * watered yet, and Plant sows their first words (/review?new=5&topic=…);
 * after that they count as the learner's. "Looking for a word?" searches
 * the words of the beds already loaded this visit (topic details in the
 * React Query cache) and is hidden when none match; a cross-topic word
 * search endpoint is v2. Recent searches (3) live in localStorage.
 */
export function TopicSearchLive() {
  const t = useTranslations('screens.topics');
  const topics = useTopics();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => setRecent(loadRecent('topics')), []);

  if (topics.isPending) return <LiveLoading />;
  if (topics.isError || !topics.data) return <LiveError onRetry={() => void topics.refetch()} />;

  const q = query.trim();
  const all = toSearchTopics(topics.data as GardenTopicSummary[], t('library'), t('shared'));
  const { yours, more } = searchTopics(all, q);
  const loadedBeds = queryClient
    .getQueriesData<TopicDetail>({ queryKey: ['topics'] })
    .flatMap(([, data]) => (data && !Array.isArray(data) && Array.isArray(data.words) ? [data] : []));
  const hit = findWordInBeds(loadedBeds, q);
  const remember = () => {
    if (q) setRecent(saveRecent('topics', q));
  };

  return (
    <TopicSearchScreen
      query={query}
      onQueryChange={setQuery}
      onSubmit={remember}
      cancelHref={GARDEN_ROUTES.topics}
      yours={yours}
      more={more}
      plantHref={(topic) => GARDEN_ROUTES.plant(PLANT_COUNT, topic.id)}
      onOpen={remember}
      wordHint={
        hit
          ? { word: hit.word, topic: hit.topic, href: GARDEN_ROUTES.topicSearch(hit.topicId, q) }
          : null
      }
      recent={recent}
      onRecent={setQuery}
    />
  );
}
