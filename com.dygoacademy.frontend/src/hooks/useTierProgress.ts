'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { TierProgress } from '@/types';

/**
 * `GET /api/v1/srs/tier-progress` (Phase 9, "Vocabulary Mastery Tier
 * Ladder") — same shape as `useSrsStats.ts`. Both Home and Analytics call
 * this hook rather than computing anything locally, so they can't disagree
 * on the caller's tier (same rule Phase 6 FR-9.1/9.2/9.3 already fixed
 * once for streak/due-count).
 */
export function useTierProgress() {
  return useQuery({
    queryKey: ['srs', 'tier-progress'],
    queryFn: () => apiClient.get<TierProgress>('/srs/tier-progress'),
  });
}
