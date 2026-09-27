'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QuizItem, QuizType } from '@/types';

/**
 * `POST /api/v1/quizzes/generate` (FR-5.1–5.4). A `useQuery`, not
 * `useMutation`, for the same reason `useStudySession` fetches
 * `POST /srs/sessions` that way: no side effects, no persisted row (see
 * the backend's own `quiz-generator.ts` module doc) — it's a read, and
 * `useQuery` gives loading/error/refetch state for free.
 *
 * `enabled` lets the quiz page call this hook unconditionally alongside
 * `useLeechDrillQuiz` and flip which one actually fetches, rather than
 * breaking the rules of hooks with an `if` around the call itself.
 *
 * `topicWordIds` added 2026-09-20 (Phase 9, "Targeted Re-Quiz") — a third
 * scope alongside `topicId`, for an exact set of words (e.g. the ones
 * just missed in a session) rather than a whole topic. Threaded into the
 * query key too, same as every other param here, so two different word
 * sets never collide on cache.
 */
export function useGenerateQuiz(
  topicId: string | undefined,
  topicWordIds: string[] | undefined,
  types: QuizType[] | undefined,
  limit = 10,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      'quizzes',
      'generate',
      topicId ?? 'all',
      topicWordIds?.join(',') ?? 'all',
      types?.join(',') ?? 'all',
      limit,
    ],
    queryFn: () =>
      apiClient.post<QuizItem[]>('/quizzes/generate', { topicId, topicWordIds, types, limit }),
    enabled,
  });
}
