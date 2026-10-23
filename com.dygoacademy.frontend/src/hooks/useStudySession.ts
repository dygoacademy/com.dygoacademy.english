'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { SessionMode, SrsSession } from '@/types';

/**
 * `POST /api/v1/srs/sessions` (FR-4.3). A `POST` fetched through `useQuery`
 * rather than `useMutation`: the endpoint has no side effects — no
 * `study_sessions` row is created (see `StartSessionDto`'s backend comment)
 * — it is a batch read of due cards tagged with a mode, same shape as every
 * other read in this codebase (`useTopic`, `useTopics`). Using `useMutation`
 * here would mean manually wiring loading/error/refetch state that
 * `useQuery` already gives for free.
 */
export function useStudySession(
  topicId: string | undefined,
  mode: SessionMode,
  limit = 20,
  newOnly = false,
  dueOnly = false,
  /** Seeds & Harvest S1 "Plant them now": the seeds this fruit topic word dropped. */
  seedsOf?: string,
) {
  return useQuery({
    queryKey: ['srs', 'sessions', topicId ?? 'all', mode, limit, newOnly, dueOnly, seedsOf ?? ''],
    // `newOnly` / `dueOnly` are only sent when set, so older backends still accept the body.
    queryFn: () =>
      apiClient.post<SrsSession>('/srs/sessions', {
        topicId,
        mode,
        limit,
        ...(newOnly ? { newOnly } : {}),
        ...(dueOnly ? { dueOnly } : {}),
        ...(seedsOf ? { seedsOf } : {}),
      }),
  });
}
