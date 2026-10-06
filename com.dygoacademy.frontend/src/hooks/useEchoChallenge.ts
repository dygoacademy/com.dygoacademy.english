'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { EchoChallenge } from '@/types';

/** SE6 Echo challenge on GR3 (admins): `GET /api/v1/groups/:id/echo`, totals only. */
export function useEchoChallenge(groupId: string, enabled = true) {
  return useQuery({
    queryKey: ['groups', groupId, 'echo'],
    queryFn: () =>
      apiClient.get<{ echo: EchoChallenge | null }>(`/groups/${encodeURIComponent(groupId)}/echo`),
    enabled,
  });
}
