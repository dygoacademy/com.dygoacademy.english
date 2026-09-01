'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { LeechCard } from '@/types';

/**
 * `GET /api/v1/srs/leeches` — FR-3.3/FR-8.1's personal leech list (words
 * with >= 4 failures in the trailing 7 days). Same "existed since Phase 2,
 * nothing called it" story as `useSrsStats` — see that hook's comment.
 */
export function useLeeches() {
  return useQuery({
    queryKey: ['srs', 'leeches'],
    queryFn: () => apiClient.get<LeechCard[]>('/srs/leeches'),
  });
}
