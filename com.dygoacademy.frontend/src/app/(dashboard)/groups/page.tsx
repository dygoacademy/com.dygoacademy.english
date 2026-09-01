'use client';

import { CreateGroupForm } from '@/components/groups/CreateGroupForm';
import { GroupCard } from '@/components/groups/GroupCard';
import { useGroups } from '@/hooks/useGroups';

/**
 * Wireframe 3a — "Your Groups" dashboard. The one page every prior pass's
 * session report flagged as missing: Module 1's 19 backend endpoints
 * (roster, invites, topic CRUD) have been code-complete since the second
 * pass, but there was no screen anywhere in the running frontend to reach
 * any of it from — roster and invite screens were wireframe-only (turns 3,
 * 4, 8g's own captions). This is that screen, and `/groups/[groupId]`
 * (same pass) is where the rest of it lives.
 */
export default function GroupsPage() {
  const { data: groups, isPending, isError } = useGroups();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Your groups</h1>

      <CreateGroupForm />

      {isPending && (
        <div className="space-y-2">
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your groups right now. Check that the API is running.
        </p>
      )}

      {groups?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No groups yet. Create one above, or ask for an invite link.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {groups?.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}
