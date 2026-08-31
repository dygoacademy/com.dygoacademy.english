'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QuizAnswerResult } from '@/types';

export interface SubmitQuizAnswerInput {
  itemId: string;
  answer: string;
  responseMs?: number;
}

/**
 * `POST /api/v1/quizzes/:id/answer` (FR-5.1–5.5). Invalidates the `srs`
 * query key on success — a quiz answer isn't an SRS rating (no
 * `review_logs` row, no `user_word_srs` change; see `QuizService.answer`),
 * but a leech word answered correctly enough times elsewhere in the app
 * could plausibly change what `/srs/leeches` returns next, so this errs
 * toward refetching rather than assuming quizzes and SRS state can never
 * affect each other's views.
 */
export function useSubmitQuizAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, answer, responseMs }: SubmitQuizAnswerInput) =>
      apiClient.post<QuizAnswerResult>(`/quizzes/${encodeURIComponent(itemId)}/answer`, {
        answer,
        responseMs,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['srs'] });
    },
  });
}
