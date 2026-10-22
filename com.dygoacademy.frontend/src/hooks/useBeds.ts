"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { BedHarvest, BedState, SeedPackets } from "@/types";

/*
 * Seeds & Harvest Phase 1. The keys sit under ['srs', ...] like the
 * missions: planting a word (useRateWord invalidates ['srs']) is what makes
 * a bed ready to harvest.
 */

/** `GET /api/v1/beds/active`: the bed today's planting takes words from (null = none). */
export function useActiveBed() {
  return useQuery({
    queryKey: ["srs", "beds", "active"],
    queryFn: () => apiClient.get<BedState | null>("/beds/active"),
  });
}

/** `GET /api/v1/beds/:topicId/harvest`: S2 Bed harvest. */
export function useBedHarvest(topicId: string) {
  return useQuery({
    queryKey: ["srs", "beds", "harvest", topicId],
    queryFn: () =>
      apiClient.get<BedHarvest>(`/beds/${encodeURIComponent(topicId)}/harvest`),
  });
}

/** `GET /api/v1/beds/packets`: S3's 3 seed packets. */
export function useSeedPackets() {
  return useQuery({
    queryKey: ["srs", "beds", "packets"],
    queryFn: () => apiClient.get<SeedPackets>("/beds/packets"),
  });
}

/** `POST /api/v1/beds`: plant a seed packet as the active bed. */
export function usePlantBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) =>
      apiClient.post<BedState>("/beds", { topic_id: topicId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["srs"] }),
  });
}
