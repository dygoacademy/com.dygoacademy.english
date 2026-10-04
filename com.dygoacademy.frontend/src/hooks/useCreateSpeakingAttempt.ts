'use client';

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { CreateSpeakingAttemptRequest, SpeakingAttempt } from '@/types';

/**
 * `POST /api/v1/speaking/attempts`: one row per Compare (Try again adds
 * another). Numbers only, never audio (D2). No SRS or mission effect (D5).
 */
export function useCreateSpeakingAttempt() {
  return useMutation({
    mutationFn: (body: CreateSpeakingAttemptRequest) =>
      apiClient.post<SpeakingAttempt>('/speaking/attempts', body),
  });
}
