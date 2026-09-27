'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { SprintResult } from '@/types';

export interface TriggerSprintInput {
  message?: string;
  topicId?: string;
  /** UI-G rain day goal (5, 10 or 20); the backend defaults to 10. */
  wordsPerGardener?: 5 | 10 | 20;
}

/**
 * POST /api/v1/notifications/groups/:groupId/sprint — FR-6.2, ADMIN-only
 * immediate push. First real caller of this route: it's existed since the
 * sixth pass but had no trigger screen anywhere (wireframe 8g's own
 * caption flagged this). Since UI-G RD-2 every sprint also stores the
 * group's rain day for today (a second one the same day is a 409 and no
 * push goes out), so success refreshes the garden's rain-day reads.
 */
export function useTriggerSprint(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TriggerSprintInput) =>
      apiClient.post<SprintResult>(`/notifications/groups/${groupId}/sprint`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'rain-day'] });
      void queryClient.invalidateQueries({ queryKey: ['groups', 'garden-counts'] });
    },
  });
}
