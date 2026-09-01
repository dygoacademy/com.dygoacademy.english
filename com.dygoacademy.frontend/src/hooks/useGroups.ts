'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { GroupRow, GroupSummary } from '@/types';

/**
 * GET /api/v1/groups — "my groups," not every group in the tenant (see
 * GroupsService.findMine's own header comment). First real data hook for
 * Module 1's frontend, following useTopics's precedent exactly: one hook
 * per resource, built on apiClient + TanStack Query.
 */
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiClient.get<GroupSummary[]>('/groups'),
  });
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  isPublic?: boolean;
}

/** POST /api/v1/groups — mirrors CreateGroupDto exactly. */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGroupInput) => apiClient.post<GroupRow>('/groups', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

/** PATCH /api/v1/groups/:id — rename, re-describe, or toggle visibility. */
export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateGroupInput) =>
      apiClient.patch<GroupRow>(`/groups/${groupId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/**
 * DELETE /api/v1/groups/:id. Takes the id per-call rather than being
 * bound to one groupId at construction — the groups list page needs to
 * delete whichever card's button was clicked, not a single fixed group.
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => apiClient.delete<void>(`/groups/${groupId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
