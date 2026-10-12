'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { TopicSummary } from '@/types';

/**
 * The first real data hook, per the architecture doc's extension
 * checklist (§14) — one hook per resource, built on apiClient +
 * TanStack Query, never apiClient calls scattered through components.
 * GET /api/v1/topics is the one endpoint actually live as of Phase 0
 * (see docs/architecture/dygo_academy_api_surface.md §"Live today"); RLS on the backend
 * does the tenant/membership filtering, so this always returns exactly
 * what the signed-in caller may see.
 */
export function useTopics() {
  return useQuery({
    queryKey: ['topics'],
    queryFn: () => apiClient.get<TopicSummary[]>('/topics'),
  });
}
