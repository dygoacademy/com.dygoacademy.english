'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { WordSearchHit } from '@/types';

/** How long typing has to pause before a word search is sent. */
export const WORD_SEARCH_DEBOUNCE_MS = 250;

/**
 * A6b "Looking for a word?" (2026-10-17): `GET /topics/word-search` across
 * all the learner's beds, not just the ones loaded this visit. Sent once
 * typing pauses for 250 ms and the query has 2+ characters; the previous
 * result stays while the next one loads. `settled` is true when `data` is
 * the answer for `query` as it is now.
 */
export function useWordSearch(query: string) {
  const q = query.trim();
  const [debounced, setDebounced] = useState(q);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(q), WORD_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [q]);

  const search = useQuery({
    queryKey: ['topics', 'word-search', debounced],
    queryFn: () =>
      apiClient.get<WordSearchHit[]>(`/topics/word-search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  return {
    ...search,
    settled: debounced === q && search.isSuccess && !search.isPlaceholderData,
  };
}
