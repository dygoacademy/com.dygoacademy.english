'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useCreateInvite, useInvites, useRevokeInvite } from '@/hooks/useInvites';
import { ApiError } from '@/lib/api-client';
import type { CreatedInvite, GroupRole } from '@/types';

const ROLES: GroupRole[] = ['READ', 'WRITE', 'ADMIN'];

/**
 * Wireframe 3d — the magic-invite-link screen. `POST /groups/:id/invites`
 * returns the raw token exactly once (GroupsController's own comment —
 * only its SHA-256 hash is ever persisted), so the freshly-minted link is
 * held in local state here rather than derived from `useInvites`, which
 * can never see it again after this render.
 */
export function InvitesPanel({ groupId }: { groupId: string }) {
  const { data: invites, isPending, isError } = useInvites(groupId);
  const createInvite = useCreateInvite(groupId);
  const revokeInvite = useRevokeInvite(groupId);
  const [grantRole, setGrantRole] = useState<GroupRole>('READ');
  const [justCreated, setJustCreated] = useState<CreatedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const joinUrl = (token: string) =>
    typeof window !== 'undefined'
      ? `${window.location.origin}${ROUTES.join(token)}`
      : ROUTES.join(token);

  const handleCreate = async () => {
    setError(null);
    setCopied(false);
    try {
      const invite = await createInvite.mutateAsync({ grantRole });
      setJustCreated(invite);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create an invite link.');
    }
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(joinUrl(token));
      setCopied(true);
    } catch {
      // Clipboard permission denial isn't fatal — the link is still
      // visible in the input below for a manual copy.
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setError(null);
    try {
      await revokeInvite.mutateAsync(inviteId);
      if (justCreated?.id === inviteId) setJustCreated(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke this invite.');
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Invite links</h2>

      <div className="flex items-center gap-2">
        <select
          value={grantRole}
          onChange={(e) => setGrantRole(e.target.value as GroupRole)}
          className="rounded-md border px-2 py-1.5 text-xs outline-none"
          aria-label="Role granted by the new link"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              Joins as {role}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={handleCreate} disabled={createInvite.isPending}>
          {createInvite.isPending ? 'Minting…' : '+ New link'}
        </Button>
      </div>

      {justCreated && (
        <div className="flex flex-col gap-1 rounded-xl border border-primary/40 bg-primary/5 p-3 text-xs">
          <p className="text-muted-foreground">
            Copy this now — it won&apos;t be shown again after you leave this page.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={joinUrl(justCreated.token)}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 truncate rounded-md border bg-background px-2 py-1 font-mono"
            />
            <Button size="sm" variant="outline" onClick={() => handleCopy(justCreated.token)}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {isPending && <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />}
      {isError && <p className="text-sm text-muted-foreground">Couldn&apos;t load invite links.</p>}
      {invites?.length === 0 && (
        <p className="text-xs text-muted-foreground">No live invite links.</p>
      )}

      <div className="flex flex-col gap-1.5">
        {invites?.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs"
          >
            <span>
              Joins as <b>{invite.grant_role}</b> · used {invite.use_count}
              {invite.max_uses ? `/${invite.max_uses}` : ''} times
              {invite.expires_at &&
                ` · expires ${new Date(invite.expires_at).toLocaleDateString()}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRevoke(invite.id)}
              disabled={revokeInvite.isPending}
            >
              Revoke
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
