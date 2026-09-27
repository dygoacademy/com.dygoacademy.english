'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { getResolvedTimezone } from '@/lib/timezone';
import type { UpcomingActivity } from '@/types';

/**
 * `GET /api/v1/srs/activity/upcoming` (Phase 9, "Upcoming Path") — the
 * forward-looking sibling of `useDailyActivity`. Same shape, same
 * reasoning for keying `days` into the query key, and same `tz` param for
 * the same day-boundary-agreement reason (see useDailyActivity's comment).
 */
export function useUpcomingActivity(days = 7, timezone: string = getResolvedTimezone()) {
  return useQuery({
    queryKey: ['srs', 'activity', 'upcoming', days, timezone],
    queryFn: () =>
      apiClient.get<UpcomingActivity[]>(
        `/srs/activity/upcoming?days=${days}&tz=${encodeURIComponent(timezone)}`,
      ),
  });
}
