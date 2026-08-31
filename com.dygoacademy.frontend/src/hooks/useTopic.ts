'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { TopicDetail } from '@/types';

/**
 * GET /api/v1/topics/:id — topic detail with its words (Module 2 frontend
 * integration, master_project_schedule.md Phase 1 task 3: "real-time
 * enrichment status polling via TanStack Query").
 *
 * Polls every 2.5s only while at least one word is still ENRICHING —
 * BullMQ jobs usually settle in low single-digit seconds, and there's no
 * websocket/SSE channel yet, so short polling is the honest Phase 1
 * implementation rather than a fake "real-time" claim. Stops polling once
 * every word has resolved to READY or FAILED, so an idle topic screen
 * doesn't keep hitting the API forever.
 */
export function useTopic(topicId: string | undefined) {
  return useQuery({
    queryKey: ['topics', topicId],
    queryFn: () => apiClient.get<TopicDetail>(`/topics/${topicId}`),
    enabled: Boolean(topicId),
    refetchInterval: (query) => {
      const words = query.state.data?.words;
      const stillEnriching = words?.some((w) => w.status === 'ENRICHING') ?? false;
      return stillEnriching ? 2500 : false;
    },
  });
}
