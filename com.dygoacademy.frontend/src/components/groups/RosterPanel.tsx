'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useGroupMembers, useRemoveMember, useUpdateMemberRole } from '@/hooks/useGroupMembers';
import { ApiError } from '@/lib/api-client';
import type { GroupRole } from '@/types';

const ROLES: GroupRole[] = ['ADMIN', 'WRITE', 'READ'];

/**
 * Wireframe 3c — the roster. `GET /groups/:id/members` never returns an
 * email or display name (`GroupRosterMember` is `user_id`/`role`/
 * `joined_at` only — no profile join in `GroupsService.findMembers`), so
 * this shows a shortened user id rather than inventing a name the API
 * doesn't provide. Flagged in the session report as a real gap (no
 * roster-with-profile endpoint exists yet), not silently patched over here.
 *
 * `canManage` gates the role dropdown and remove button — a READ member's
 * own request only ever returns their own row anyway (RLS,
 * GroupsController.findMembers's own comment), so this is UI-level
 * tidiness on top of a real server-side guarantee, not the only thing
 * standing between a student and someone else's role.
 */
export function RosterPanel({
  groupId,
  currentUserId,
  canManage,
}: {
  groupId: string;
  currentUserId: string;
  canManage: boolean;
}) {
  const { data: members, isPending, isError } = useGroupMembers(groupId);
  const updateRole = useUpdateMemberRole(groupId);
  const removeMember = useRemoveMember(groupId);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, role: GroupRole) => {
    setError(null);
    try {
      await updateRole.mutateAsync({ userId, role });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this role.');
    }
  };

  const handleRemove = async (userId: string) => {
    setError(null);
    try {
      await removeMember.mutateAsync(userId);
    } catch (err) {
      // 409 is GroupsService.removeMember's last-ADMIN guard — the one
      // ApiError case worth a specific message rather than the generic one.
      setError(
        err instanceof ApiError && err.status === 409
          ? "Can't remove the group's last ADMIN — assign someone else first."
          : err instanceof ApiError
            ? err.message
            : 'Could not remove this member.',
      );
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Roster</h2>

      {isPending && <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />}
      {isError && <p className="text-sm text-muted-foreground">Couldn&apos;t load the roster.</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-col gap-1.5">
        {members?.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
          >
            <span className="font-mono text-xs">
              {member.user_id.slice(0, 8)}…
              {member.user_id === currentUserId && ' (you)'}
            </span>

            {canManage ? (
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.user_id, e.target.value as GroupRole)}
                  disabled={updateRole.isPending}
                  className="rounded-md border px-2 py-1 text-xs outline-none"
                  aria-label={`Role for ${member.user_id}`}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(member.user_id)}
                  disabled={removeMember.isPending}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {member.role}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
