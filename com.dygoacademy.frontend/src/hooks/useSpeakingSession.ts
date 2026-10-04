'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { SpeakingSession } from '@/types';

/**
 * The Pond: `GET /api/v1/speaking/session` (5 of the learner's words with
 * native audio, due → new → rest). Not refetched in the background, so the
 * sentences don't change mid-session.
 */
export function useSpeakingSession(topicId?: string) {
  return useQuery({
    queryKey: ['speaking', 'session', topicId ?? 'all'],
    queryFn: () =>
      apiClient.get<SpeakingSession>(
        topicId ? `/speaking/session?topic_id=${encodeURIComponent(topicId)}` : '/speaking/session',
      ),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
