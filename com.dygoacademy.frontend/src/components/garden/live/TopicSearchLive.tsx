'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useTopics } from '@/hooks/useTopics';
import { useWordSearch } from '@/hooks/useWordSearch';
import { findMatch } from '@/lib/search/fold';
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
 * after that they count as the learner's. "Looking for a word?" is the
 * first `GET /topics/word-search` result (all the learner's beds, the
 * English word or its meaning; 2026-10-17). Until that answers for what's
 * typed now, the beds already loaded this visit (topic details in the
 * React Query cache) answer instantly, else the previous result while its
 * word still matches, so the row doesn't flicker. Hidden when nothing
 * matches. Recent searches (3) live in localStorage.
 */
export function TopicSearchLive() {
  const t = useTranslations('screens.topics');
  const topics = useTopics();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const wordSearch = useWordSearch(query);

  useEffect(() => setRecent(loadRecent('topics')), []);

  if (topics.isPending) return <LiveLoading />;
  if (topics.isError || !topics.data) return <LiveError onRetry={() => void topics.refetch()} />;

  const q = query.trim();
  const all = toSearchTopics(topics.data as GardenTopicSummary[], t('library'), t('shared'));
  const { yours, more } = searchTopics(all, q);
  const loadedBeds = queryClient
    .getQueriesData<TopicDetail>({ queryKey: ['topics'] })
    .flatMap(([, data]) => (data && !Array.isArray(data) && Array.isArray(data.words) ? [data] : []));
  const found = wordSearch.data?.[0];
  const apiHit = found
    ? {
        word: found.word,
        topicId: found.topic_id,
        // The bed's title as A6 shows it (My words is translated there).
        topic: topics.data.find((topic) => topic.id === found.topic_id)?.title ?? found.topic_title,
        matched: found.matched,
      }
    : null;
  const cacheHit = findWordInBeds(loadedBeds, q);
  const hit =
    q.length < 2
      ? null
      : wordSearch.settled
        ? apiHit
        : cacheHit
          ? { ...cacheHit, matched: 'word' as const }
          : apiHit?.matched === 'word' && findMatch(apiHit.word, q)
            ? apiHit
            : null;
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
          ? {
              word: hit.word,
              topic: hit.topic,
              href: GARDEN_ROUTES.topicSearch(hit.topicId, q),
              highlight: hit.matched === 'word',
            }
          : null
      }
      recent={recent}
      onRecent={setQuery}
    />
  );
}
