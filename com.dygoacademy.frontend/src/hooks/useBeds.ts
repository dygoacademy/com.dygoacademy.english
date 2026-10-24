'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type {
  ActiveBed,
  BedHarvest,
  BedState,
  SeedDrop,
  SeedPacketKind,
  SeedPackets,
} from '@/types';

/*
 * Seeds & Harvest Phase 1. The keys sit under ['srs', ...] like the
 * missions: planting a word (useRateWord invalidates ['srs']) is what makes
 * a bed ready to harvest.
 */

/** `GET /api/v1/beds/active`: the bed today's planting takes words from (null = none). */
export function useActiveBed(enabled = true) {
  return useQuery({
    queryKey: ['srs', 'beds', 'active'],
    queryFn: () => apiClient.get<ActiveBed | null>('/beds/active'),
    enabled,
  });
}

/** `GET /api/v1/beds/:topicId/harvest`: S2 Bed harvest. */
export function useBedHarvest(topicId: string) {
  return useQuery({
    queryKey: ['srs', 'beds', 'harvest', topicId],
    queryFn: () => apiClient.get<BedHarvest>(`/beds/${encodeURIComponent(topicId)}/harvest`),
  });
}

/** `GET /api/v1/beds/packets`: S3's 3 seed packets. */
export function useSeedPackets() {
  return useQuery({
    queryKey: ['srs', 'beds', 'packets'],
    queryFn: () => apiClient.get<SeedPackets>('/beds/packets'),
  });
}

/** `POST /api/v1/beds`: plant a seed packet as the active bed. */
export function usePlantBed() {
  const queryClient = useQueryClient();
  return useMutation({
    // `slot` = the packet kind picked (analytics `packet_chosen`).
    mutationFn: ({ topicId, slot }: { topicId: string; slot?: SeedPacketKind }) =>
      apiClient.post<BedState>('/beds', { topic_id: topicId, ...(slot ? { slot } : {}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['srs'] }),
  });
}

/** `GET /api/v1/beds/seed-drops/next`: the oldest seed drop not shown yet (S1), only when `enabled`. */
export function useNextSeedDrop(enabled: boolean) {
  return useQuery({
    queryKey: ['srs', 'beds', 'seed-drops', 'next'],
    queryFn: () => apiClient.get<SeedDrop | null>('/beds/seed-drops/next'),
    enabled,
  });
}

/** `GET /api/v1/beds/seed-drops/:droppedBy`: the seeds one fruit word dropped (S1). */
export function useSeedDrop(droppedBy: string) {
  return useQuery({
    queryKey: ['srs', 'beds', 'seed-drops', droppedBy],
    queryFn: () => apiClient.get<SeedDrop>(`/beds/seed-drops/${encodeURIComponent(droppedBy)}`),
  });
}

/** `POST /api/v1/beds/seed-drops/:droppedBy/seen`: S1 was shown. */
export function useMarkSeedDropSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (droppedBy: string) =>
      apiClient.post<void>(`/beds/seed-drops/${encodeURIComponent(droppedBy)}/seen`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['srs', 'beds', 'seed-drops', 'next'] }),
  });
}
