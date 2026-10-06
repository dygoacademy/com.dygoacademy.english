'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { getResolvedTimezone } from '@/lib/timezone';
import type { CreateSpeakingAttemptRequest, SpeakingAttempt } from '@/types';

/**
 * `POST /api/v1/speaking/attempts`: one row per Compare (Try again adds
 * another). Numbers only, never audio (D2). No SRS effect (D5). The day's
 * first attempt at a sentence counts toward the SPEAK mission (SE1), and
 * `harvest` at 90%+ harvests the word (SE5), so both are refetched after.
 */
export function useCreateSpeakingAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSpeakingAttemptRequest) =>
      apiClient.post<SpeakingAttempt>('/speaking/attempts', {
        ...body,
        tz: body.tz ?? getResolvedTimezone(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['srs', 'missions'] });
      void queryClient.invalidateQueries({ queryKey: ['speaking', 'harvest'] });
    },
  });
}
