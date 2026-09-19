'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useDeleteGroup, useUpdateGroup } from '@/hooks/useGroups';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useTopics } from '@/hooks/useTopics';
import { ApiError } from '@/lib/api-client';
import type { GroupSummary } from '@/types';

/**
 * ADMIN-only rename/visibility/delete — folded into the detail page rather
 * than a separate route.
 *
 * Delete confirm upgraded from `window.confirm` to `ui/alert-dialog.tsx`'s
 * AlertDialog 2026-09-19 (Phase 2 FR-10.3), and moved into its own "Danger
 * zone" block below a divider instead of sitting next to "Save changes" at
 * equal visual weight -- the audit's finding was specifically that the two
 * had "no more friction than" each other despite one being reversible and
 * one not. The confirm names the roster size and topic count, not just the
 * group name, via `useGroupMembers`/`useTopics` (the same hooks
 * `RosterPanel`/`GroupTopicsPanel` already call elsewhere on this page --
 * TanStack Query dedupes the request rather than firing a third fetch).
 */
export function GroupSettingsPanel({ group }: { group: GroupSummary }) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [isPublic, setIsPublic] = useState(group.is_public);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const updateGroup = useUpdateGroup(group.id);
  const deleteGroup = useDeleteGroup();
  const { data: members } = useGroupMembers(group.id);
  const { data: allTopics } = useTopics();
  const topicCount = allTopics?.filter((t) => t.group_id === group.id).length ?? 0;

  const dirty =
    name.trim() !== group.name ||
    (description.trim() || null) !== group.description ||
    isPublic !== group.is_public;

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    try {
      await updateGroup.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        isPublic,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save these changes.');
    }
  };

  // preventDefault stops AlertDialogAction's built-in auto-close, same
  // reason as the topic-delete dialogs -- a failed delete's error (below)
  // would otherwise vanish with the dialog before anyone could read it.
  const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await deleteGroup.mutateAsync(group.id);
      router.push(ROUTES.groups);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this group.');
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Settings</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={120}
        aria-label="Group name"
        className="rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
        rows={2}
        aria-label="Group description"
        className="resize-none rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        Public — discoverable, and its topics are cloneable by other groups
      </label>
      {saved && !dirty && <p className="text-xs text-muted-foreground">Saved.</p>}
      <Button
        size="sm"
        className="self-start"
        onClick={handleSave}
        disabled={!name.trim() || !dirty || updateGroup.isPending}
      >
        {updateGroup.isPending ? 'Saving…' : 'Save changes'}
      </Button>

      <div className="mt-2 flex flex-col gap-2 border-t pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
          Danger zone
        </h3>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          size="sm"
          variant="destructive"
          className="self-start"
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={deleteGroup.isPending}
        >
          Delete group
        </Button>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{group.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {members?.length ?? 0} {members?.length === 1 ? 'member' : 'members'}{' '}
              and {topicCount} {topicCount === 1 ? 'topic' : 'topics'} — every word and everyone&apos;s
              study history goes with it. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteGroup.isPending}>
              {deleteGroup.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
