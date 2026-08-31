'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QuizItem } from '@/types';

/**
 * `GET /api/v1/quizzes/leech-drill` (FR-3.3's "intensive remedial drill" —
 * see the backend's `QuizService.leechDrill`). `enabled` mirrors
 * `useGenerateQuiz`'s — see that hook's comment for why.
 */
export function useLeechDrillQuiz(enabled = true) {
  return useQuery({
    queryKey: ['quizzes', 'leech-drill'],
    queryFn: () => apiClient.get<QuizItem[]>('/quizzes/leech-drill'),
    enabled,
  });
}
