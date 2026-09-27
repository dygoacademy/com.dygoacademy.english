'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { getResolvedTimezone } from '@/lib/timezone';
import type { SrsStats } from '@/types';

/**
 * `GET /api/v1/srs/stats` — FR-8.1's per-student stats (streak, mastery,
 * due, leech counts). The backend route has existed since Phase 2; nothing
 * on the frontend called it until this pass (9th) — `(dashboard)/analytics`
 * was still the Phase-0 "Coming in a later phase" stub, and `topics/page.tsx`
 * hardcoded a mock leech count instead (see `LeechNudge`'s own comment).
 *
 * `tz` (lib/timezone.ts's resolved zone) tells the backend which calendar
 * to compute the streak's day boundaries in — was hardcoded UTC server-side,
 * which broke the count for the same reason LearningPath.tsx's ribbon did
 * (see that file's comment).
 */
export function useSrsStats() {
  const timezone = getResolvedTimezone();
  return useQuery({
    queryKey: ['srs', 'stats', timezone],
    queryFn: () => apiClient.get<SrsStats>(`/srs/stats?tz=${encodeURIComponent(timezone)}`),
  });
}
