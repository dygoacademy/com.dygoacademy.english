'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError, apiClient } from '@/lib/api-client';
import { enqueueReview } from '@/lib/offline-review-queue';
import type { RateWordResult, SrsRating } from '@/types';

export interface RateWordInput {
  topicWordId: string;
  rating: SrsRating;
  responseMs?: number;
}

export type RateWordOutcome = { status: 'applied'; result: RateWordResult } | { status: 'queued' };

/**
 * `POST /api/v1/srs/rate` (FR-3.2). Invalidates the session/due-card
 * queries and stats on success — the just-rated card's next_due_at moved,
 * so a stale cache would show it as still due. Not patched in place: the
 * due-card queue's *membership* changes (a card can leave it entirely),
 * which is a shape of update `setQueryData` handles awkwardly compared to
 * just refetching, matching `useCreateWord`'s reasoning for the same choice.
 *
 * Module 4's offline-first gap: a request that fails because there is no
 * network path to the API at all (`fetch` itself throwing, not the server
 * responding with an error) is queued to IndexedDB via `enqueueReview`
 * instead of being lost — `useOfflineReviewSync` drains that queue through
 * `POST /srs/sync` once the browser is back online. An `ApiError` (the
 * server was reached and said no) is rethrown unchanged rather than
 * queued: retrying the exact same request later would just fail the same
 * way, and silently swallowing a real error would hide it from
 * `rateWord.isError` for good. The rating's FSRS schedule is never
 * computed client-side either way — that math is `fsrs-scheduler.ts`'s
 * alone — so a queued rating shows no immediate stats update; the study
 * session doesn't wait on this promise regardless (see `study/page.tsx`'s
 * `handleRate`, which advances to the next card immediately).
 */
export function useRateWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RateWordInput): Promise<RateWordOutcome> => {
      try {
        const result = await apiClient.post<RateWordResult>('/srs/rate', input);
        return { status: 'applied', result };
      } catch (err) {
        if (err instanceof ApiError) throw err;
        await enqueueReview({
          topicWordId: input.topicWordId,
          rating: input.rating,
          reviewedAt: new Date().toISOString(),
          responseMs: input.responseMs,
        });
        return { status: 'queued' };
      }
    },
    onSuccess: (outcome) => {
      if (outcome.status === 'applied') {
        void queryClient.invalidateQueries({ queryKey: ['srs'] });
      }
    },
  });
}
