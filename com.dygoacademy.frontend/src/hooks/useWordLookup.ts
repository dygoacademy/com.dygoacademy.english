'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { WordLookup } from '@/types';

/** How long typing has to pause before the Add word sheet looks a word up. */
export const WORD_LOOKUP_DEBOUNCE_MS = 300;

/**
 * A7b Add word (2026-10-17): `GET /words/lookup` for what the learner is
 * typing, once typing pauses for 300 ms. Read-only on the server (nothing
 * is planted or enriched). `settled` is true when `data` is the answer
 * for `word` as it is now.
 */
export function useWordLookup(word: string) {
  const w = word.trim();
  const [debounced, setDebounced] = useState(w);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(w), WORD_LOOKUP_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [w]);

  const lookup = useQuery({
    queryKey: ['words', 'lookup', debounced.toLowerCase()],
    queryFn: () =>
      apiClient.get<WordLookup>(`/words/lookup?word=${encodeURIComponent(debounced)}`),
    enabled: debounced.length > 0,
    staleTime: 60_000,
    retry: false,
  });
  return {
    ...lookup,
    settled: debounced === w && lookup.isSuccess,
  };
}
