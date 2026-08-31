'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { RateWordResult, SrsRating } from '@/types';

export interface RateWordInput {
  topicWordId: string;
  rating: SrsRating;
  responseMs?: number;
}

/**
 * `POST /api/v1/srs/rate` (FR-3.2). Invalidates the session/due-card
 * queries and stats on success — the just-rated card's next_due_at moved,
 * so a stale cache would show it as still due. Not patched in place: the
 * due-card queue's *membership* changes (a card can leave it entirely),
 * which is a shape of update `setQueryData` handles awkwardly compared to
 * just refetching, matching `useCreateWord`'s reasoning for the same choice.
 */
export function useRateWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RateWordInput) => apiClient.post<RateWordResult>('/srs/rate', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['srs'] });
    },
  });
}
