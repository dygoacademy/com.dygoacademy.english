'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QuizItem, QuizType } from '@/types';

/**
 * `POST /api/v1/quizzes/generate` (FR-5.1–5.4). A `useQuery`, not
 * `useMutation`, for the same reason `useStudySession` fetches
 * `POST /srs/sessions` that way: no side effects, no persisted row (see
 * the backend's `quiz-generator.ts` module doc) — it's a read, and
 * `useQuery` gives loading/error/refetch state for free.
 *
 * `enabled` lets the quiz page call this hook unconditionally alongside
 * `useLeechDrillQuiz` and flip which one actually fetches, rather than
 * breaking the rules of hooks with an `if` around the call itself.
 */
export function useGenerateQuiz(
  topicId: string | undefined,
  types: QuizType[] | undefined,
  limit = 10,
  enabled = true,
) {
  return useQuery({
    queryKey: ['quizzes', 'generate', topicId ?? 'all', types?.join(',') ?? 'all', limit],
    queryFn: () => apiClient.post<QuizItem[]>('/quizzes/generate', { topicId, types, limit }),
    enabled,
  });
}
