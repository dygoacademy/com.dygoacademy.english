'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { GroupHeatmapEntry } from '@/types';

/**
 * `GET /api/v1/groups/:id/heatmap` — Module 8, FR-8.2. ADMIN-only on the
 * backend (`AnalyticsService.groupHeatmap`); `enabled` gates the query so a
 * non-ADMIN caller never fires a request destined to 403 — the analytics
 * page only mounts this hook for groups the signed-in user is already
 * ADMIN of (see `AnalyticsPage`'s own filtering on `useGroups()`).
 */
export function useGroupHeatmap(groupId: string, enabled = true) {
  return useQuery({
    queryKey: ['groups', groupId, 'heatmap'],
    queryFn: () => apiClient.get<GroupHeatmapEntry[]>(`/groups/${groupId}/heatmap`),
    enabled: enabled && Boolean(groupId),
  });
}
