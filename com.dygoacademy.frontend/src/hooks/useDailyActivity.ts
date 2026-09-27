'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { getResolvedTimezone } from '@/lib/timezone';
import type { DailyActivity } from '@/types';

/**
 * `GET /api/v1/srs/activity` (Phase 3 Module 18, FR-18.1) — per-day review
 * counts backing Home's activity trail. `days` in the query key so a
 * future caller asking for a different window doesn't share a cache entry
 * with the default one.
 *
 * `timezone` (default: lib/timezone.ts's resolved zone) is sent as `tz` so
 * the backend groups `reviewed_at` into the same calendar days this
 * caller's "today" uses — see LearningPath.tsx's comment for the bug this
 * closes. Also keyed into the query so a stale cache entry from a
 * different zone (e.g. right after `getResolvedTimezone()` first resolves)
 * never gets served.
 */
export function useDailyActivity(days = 7, timezone: string = getResolvedTimezone()) {
  return useQuery({
    queryKey: ['srs', 'activity', days, timezone],
    queryFn: () =>
      apiClient.get<DailyActivity[]>(`/srs/activity?days=${days}&tz=${encodeURIComponent(timezone)}`),
  });
}
