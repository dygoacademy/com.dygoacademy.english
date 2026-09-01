'use client';

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { SprintResult } from '@/types';

export interface TriggerSprintInput {
  message?: string;
  topicId?: string;
}

/**
 * POST /api/v1/notifications/groups/:groupId/sprint — FR-6.2, ADMIN-only
 * immediate push. First real caller of this route: it's existed since the
 * sixth pass but had no trigger screen anywhere (wireframe 8g's own
 * caption flagged this). Nothing to invalidate on success — a sprint has
 * no persisted row for any query here to be stale about (no
 * `notification_log` table, see NotificationsService's own header note).
 */
export function useTriggerSprint(groupId: string) {
  return useMutation({
    mutationFn: (input: TriggerSprintInput) =>
      apiClient.post<SprintResult>(`/notifications/groups/${groupId}/sprint`, input),
  });
}
