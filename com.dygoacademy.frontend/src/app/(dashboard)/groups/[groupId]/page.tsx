'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { GroupSettingsPanel } from '@/components/groups/GroupSettingsPanel';
import { GroupTopicsPanel } from '@/components/groups/GroupTopicsPanel';
import { InvitesPanel } from '@/components/groups/InvitesPanel';
import { RosterPanel } from '@/components/groups/RosterPanel';
import { SprintTrigger } from '@/components/groups/SprintTrigger';
import { ROUTES } from '@/constants/routes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGroups } from '@/hooks/useGroups';

/**
 * Wireframes 3c/3d/4b/8g, assembled — the group's own home. There is no
 * `GET /groups/:id` (Module 1's API surface only ever named a list route
 * for a single group's summary), so the header info comes from
 * `useGroups()` filtered to this id, the same "list + client-side find"
 * pattern the topic detail page used before `GET /topics/:id` existed
 * (see that page's own turn-3 history) — everything below the header
 * (roster, invites, topics) has its own dedicated, group-scoped endpoint.
 */
export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;

  const { data: groups, isPending, isError } = useGroups();
  const { data: currentUser } = useCurrentUser();
  const group = groups?.find((g) => g.id === groupId);

  if (isPending) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="mx-auto max-w-md p-6 text-sm text-muted-foreground">
        <Link href={ROUTES.groups} className="hover:underline">
          ← Your groups
        </Link>
        <p className="mt-4">
          {isError
            ? "Couldn't load your groups right now."
            : "This group doesn't exist, or you're not a member."}
        </p>
      </div>
    );
  }

  const canManage = group.role === 'ADMIN';
  const canWrite = group.role === 'ADMIN' || group.role === 'WRITE';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <div>
        <Link href={ROUTES.groups} className="text-xs text-muted-foreground hover:underline">
          ← Your groups
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{group.name}</h1>
          <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {group.role}
          </span>
        </div>
        {group.description && (
          <p className="text-sm text-muted-foreground">{group.description}</p>
        )}
      </div>

      <GroupTopicsPanel group={group} canWrite={canWrite} canManage={canManage} />

      <RosterPanel groupId={group.id} currentUserId={currentUser?.id ?? ''} canManage={canManage} />

      {canManage && (
        <>
          <InvitesPanel groupId={group.id} />
          <SprintTrigger groupId={group.id} />
          <GroupSettingsPanel group={group} />
        </>
      )}
    </div>
  );
}
