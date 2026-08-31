'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { StudySchedule } from '@/types';

/** `GET /api/v1/notifications/schedules` (FR-6.1). */
export function useNotificationSchedules() {
  return useQuery({
    queryKey: ['notifications', 'schedules'],
    queryFn: () => apiClient.get<StudySchedule[]>('/notifications/schedules'),
  });
}
