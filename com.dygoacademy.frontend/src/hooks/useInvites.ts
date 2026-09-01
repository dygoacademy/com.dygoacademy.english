'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { CreatedInvite, GroupInviteSummary, GroupRole, RedeemedInvite } from '@/types';

/** GET /api/v1/groups/:id/invites — ADMIN only. Live links only, per the endpoint's own doc. */
export function useInvites(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'invites'],
    queryFn: () => apiClient.get<GroupInviteSummary[]>(`/groups/${groupId}/invites`),
    enabled: Boolean(groupId),
  });
}

export interface CreateInviteInput {
  grantRole?: GroupRole;
  maxUses?: number;
  expiresInHours?: number;
}

/**
 * POST /api/v1/groups/:id/invites. The raw token in the response is the
 * only time it's ever visible — the mutation's own `data` on success is
 * where a caller must read it and build the shareable `/join/:token` link;
 * `useInvites` above never returns it (only the hash is persisted).
 */
export function useCreateInvite(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInviteInput) =>
      apiClient.post<CreatedInvite>(`/groups/${groupId}/invites`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'invites'] });
    },
  });
}

/**
 * DELETE /api/v1/invites/:id — a top-level route, not nested under
 * /groups/:id (InvitesController's own comment: revoking needs the
 * invite's id, not its group's). Still invalidates the group-scoped list
 * query by groupId since that's the only cache a revoked invite could be
 * sitting in.
 */
export function useRevokeInvite(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => apiClient.delete<void>(`/invites/${inviteId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'invites'] });
    },
  });
}

/**
 * POST /api/v1/invites/:token/redeem — any authenticated user, used by
 * `/join/:token`. Invalidates `['groups']` on success since a redemption
 * changes which groups the caller belongs to.
 */
export function useRedeemInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => apiClient.post<RedeemedInvite>(`/invites/${token}/redeem`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
