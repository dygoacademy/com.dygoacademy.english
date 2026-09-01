'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { SrsStats } from '@/types';

/**
 * `GET /api/v1/srs/stats` — FR-8.1's per-student stats (streak, mastery,
 * due, leech counts). The backend route has existed since Phase 2; nothing
 * on the frontend called it until this pass (9th) — `(dashboard)/analytics`
 * was still the Phase-0 "Coming in a later phase" stub, and `topics/page.tsx`
 * hardcoded a mock leech count instead (see `LeechNudge`'s own comment).
 */
export function useSrsStats() {
  return useQuery({
    queryKey: ['srs', 'stats'],
    queryFn: () => apiClient.get<SrsStats>('/srs/stats'),
  });
}
