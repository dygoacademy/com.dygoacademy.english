'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { DailyActivity } from '@/types';

/**
 * `GET /api/v1/srs/activity` (Phase 3 Module 18, FR-18.1) — per-day review
 * counts backing Home's activity trail. `days` in the query key so a
 * future caller asking for a different window doesn't share a cache entry
 * with the default one.
 */
export function useDailyActivity(days = 7) {
  return useQuery({
    queryKey: ['srs', 'activity', days],
    queryFn: () => apiClient.get<DailyActivity[]>(`/srs/activity?days=${days}`),
  });
}
