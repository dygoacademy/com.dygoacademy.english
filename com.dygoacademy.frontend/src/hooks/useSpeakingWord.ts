'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { SpeakingWordItem } from '@/types';

/**
 * One word's speaking item: `GET /api/v1/speaking/words/:topicWordId`.
 * For the single-sentence speaking flow opened from "Ready to harvest"
 * (SE5) and the Echo challenge (SE6).
 */
export function useSpeakingWord(topicWordId: string) {
  return useQuery({
    queryKey: ['speaking', 'word', topicWordId],
    queryFn: () =>
      apiClient.get<SpeakingWordItem>(`/speaking/words/${encodeURIComponent(topicWordId)}`),
    refetchOnWindowFocus: false,
  });
}
