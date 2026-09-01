'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { GroupRole, GroupRosterMember } from '@/types';

/**
 * GET /api/v1/groups/:id/members — the roster. RLS narrows this to "just
 * my own row" for a READ member and "everyone" for WRITE/ADMIN
 * (GroupsController.findMembers's own comment); this hook doesn't need to
 * know which case applies, the response already reflects it.
 */
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => apiClient.get<GroupRosterMember[]>(`/groups/${groupId}/members`),
    enabled: Boolean(groupId),
  });
}

/** PATCH /api/v1/groups/:id/members/:userId — ADMIN only. */
export function useUpdateMemberRole(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: GroupRole }) =>
      apiClient.patch<GroupRosterMember>(`/groups/${groupId}/members/${userId}`, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'members'] });
    },
  });
}

/**
 * DELETE /api/v1/groups/:id/members/:userId — ADMIN only. Can 409 on the
 * group's last ADMIN (GroupsService.removeMember's own guard, fixed in the
 * fifth pass) — callers should surface `ApiError.status === 409` distinctly
 * rather than a generic failure message.
 */
export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => apiClient.delete<void>(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'members'] });
    },
  });
}
