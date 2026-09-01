'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { TopicWord } from '@/types';

/**
 * POST /api/v1/words/:id/re-enrich — the "Try again" button on the FAILED
 * word state (wireframe 1l, WordStatusRow.tsx), unwired since Module 2
 * shipped: the button existed in the wireframe and the frontend markup, but
 * had no `onClick` and the backend route didn't exist until the twelfth
 * pass. Mirrors `useCreateWord`'s invalidation — the row flips back to
 * ENRICHING and `useTopic`'s existing 2.5s poll (topic detail) picks up the
 * eventual READY/FAILED result the same way it does for a brand-new word.
 */
export function useReEnrichWord(topicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topicWordId: string) => apiClient.post<TopicWord>(`/words/${topicWordId}/re-enrich`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['topics', topicId] });
    },
  });
}
