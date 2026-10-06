'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { SpeakingHarvestWord } from '@/types';

/** SE5 "Ready to harvest": `GET /api/v1/speaking/harvest?topic_id=`. */
export function useSpeakingHarvest(topicId: string) {
  return useQuery({
    queryKey: ['speaking', 'harvest', topicId],
    queryFn: () =>
      apiClient.get<SpeakingHarvestWord[]>(
        `/speaking/harvest?topic_id=${encodeURIComponent(topicId)}`,
      ),
  });
}
