'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QuizAnswerResult } from '@/types';

export interface SubmitQuizAnswerInput {
  itemId: string;
  answer: string;
  responseMs?: number;
  /** Whether the student opened `useQuizHint` for this item before answering. */
  hintUsed?: boolean;
}

/**
 * `POST /api/v1/quizzes/:id/answer` (FR-5.1–5.5). Invalidates the `srs`
 * query key on success: since Phase 10 every quiz answer writes a
 * `review_logs` row and can move the word's `user_word_srs` schedule
 * (`SrsService.recordQuizResult`), so due counts, streak, mastery and the
 * leech list can all change after a quiz.
 */
export function useSubmitQuizAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, answer, responseMs, hintUsed }: SubmitQuizAnswerInput) =>
      apiClient.post<QuizAnswerResult>(`/quizzes/${encodeURIComponent(itemId)}/answer`, {
        answer,
        responseMs,
        hintUsed,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['srs'] });
    },
  });
}
