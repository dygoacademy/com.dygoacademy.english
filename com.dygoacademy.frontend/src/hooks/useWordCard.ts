'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { WordCard } from '@/types';

/**
 * `GET /api/v1/words/:id` — backs the "click a READY word in the topic
 * list to flip its flashcard" action (the word-card modal). `enabled` is gated
 * on the caller rather than defaulting to `Boolean(topicWordId)` alone,
 * since the modal mounts unconditionally in the classic word row and should not
 * fire a fetch just because a row exists — only while its modal is open.
 */
export function useWordCard(topicWordId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['words', topicWordId],
    queryFn: () => apiClient.get<WordCard>(`/words/${topicWordId}`),
    enabled: Boolean(topicWordId) && enabled,
  });
}
