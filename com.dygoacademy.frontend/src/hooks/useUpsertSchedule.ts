'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { StudySchedule } from '@/types';

export interface UpsertScheduleInput {
  reminderTime: string;
  timezone: string;
  isEnabled?: boolean;
}

/** `POST /api/v1/notifications/schedules` — upsert on (user, reminderTime), see the DTO's own header comment. */
export function useUpsertSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertScheduleInput) =>
      apiClient.post<StudySchedule>('/notifications/schedules', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'schedules'] });
    },
  });
}
