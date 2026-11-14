'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { ReminderChannel, StudySchedule } from '@/types';

export interface UpsertScheduleInput {
  reminderTime: string;
  timezone: string;
  isEnabled?: boolean;
  /** A8c; left out = keep what is saved. */
  days?: number[];
  smart?: boolean;
  channels?: ReminderChannel[];
}

/**
 * `POST /api/v1/notifications/schedules`: sets the learner's one reminder
 * (one row per learner since 20261114_reminder_settings.sql, so a new time
 * moves it). See the backend DTO's header comment.
 */
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
