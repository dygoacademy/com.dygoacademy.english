'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { SpeakingSession } from '@/types';

/**
 * The Pond: `GET /api/v1/speaking/session` (5 of the learner's words with
 * native audio, due → new → rest, and `item_count` for the Missions card).
 * Fetched fresh on every mount (a new Pond gets the new due words) but not
 * in the background, so the sentences don't change mid-session; SpeakLive
 * waits for `isFetchedAfterMount` before taking them.
 */
export function useSpeakingSession(topicId?: string) {
  return useQuery({
    queryKey: ['speaking', 'session', topicId ?? 'all'],
    queryFn: () =>
      apiClient.get<SpeakingSession>(
        topicId ? `/speaking/session?topic_id=${encodeURIComponent(topicId)}` : '/speaking/session',
      ),
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
