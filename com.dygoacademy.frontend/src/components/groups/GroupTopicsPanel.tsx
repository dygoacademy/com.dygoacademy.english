'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CreateTopicModal } from '@/components/groups/CreateTopicModal';
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
import { useDeleteTopic } from '@/hooks/useTopicMutations';
import { useTopics } from '@/hooks/useTopics';
import { ApiError } from '@/lib/api-client';
import type { GroupSummary } from '@/types';

/**
 * Wireframe 4b — topic create/delete, scoped to one group. `GET /topics`
 * has no `groupId` filter (it returns "everything the caller may see" —
 * public topics plus every group's private ones), so this filters the
 * already-fetched list client-side, same pattern topics/browse's search
 * box already uses for title text.
 *
 * Delete is ADMIN-gated in the UI (`canManage`) to match
 * `topics_delete_admin` — wireframe 4b's own dashed note flagged, back in
 * the second pass, that a WRITE member seeing this button would be shown
 * an action that silently no-ops at the database. Not shown to them here.
 *
 * Confirm upgraded from `window.confirm` to `ui/alert-dialog.tsx`'s
 * AlertDialog 2026-09-19 (Phase 2 FR-10.1, same pass as the identical
 * upgrade on `topics/[topicId]/page.tsx` — both trigger the same delete
 * on the same data, a fixed dialog on one and a native one on the other
 * would be a worse inconsistency than either alone). `pendingDelete` holds
 * the one topic (id/title/wordCount) the dialog is currently open for,
 * rather than an open/closed boolean per row, since this is a list and
 * only one confirm can be open at a time.
 */
export function GroupTopicsPanel({
  group,
  canWrite,
  canManage,
}: {
  group: GroupSummary;
  canWrite: boolean;
  canManage: boolean;
}) {
  const { data: allTopics, isPending, isError } = useTopics();
  const deleteTopic = useDeleteTopic();
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    wordCount: number;
  } | null>(null);

  const topics = allTopics?.filter((t) => t.group_id === group.id);

  // preventDefault stops AlertDialogAction's built-in auto-close so a
  // failed delete's error message (below) stays visible instead of the
  // dialog closing out from under it -- same reasoning as WordStatusRow's
  // confirmDelete and topics/[topicId]/page.tsx's.
  const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!pendingDelete) return;
    setError(null);
    try {
      await deleteTopic.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this topic.');
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Topics</h2>
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
            + New topic
          </Button>
        )}
      </div>

      {isPending && <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />}
      {isError && <p className="text-sm text-muted-foreground">Couldn&apos;t load topics.</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {topics?.length === 0 && (
        <p className="text-xs text-muted-foreground">No topics in this group yet.</p>
      )}

      <div className="flex flex-col gap-1.5">
        {topics?.map((topic) => (
          <div
            key={topic.id}
            className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
          >
            <Link href={`/topics/${topic.id}`} className="hover:underline">
              {topic.title}
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {topic.word_count} {Number(topic.word_count) === 1 ? 'word' : 'words'}
              </span>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPendingDelete({
                      id: topic.id,
                      title: topic.title,
                      wordCount: Number(topic.word_count),
                    })
                  }
                  disabled={deleteTopic.isPending}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDelete?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes all {pendingDelete?.wordCount}{' '}
              {pendingDelete?.wordCount === 1 ? 'word' : 'words'} in it, and everyone&apos;s study
              history for them. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteTopic.isPending}>
              {deleteTopic.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateTopicModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        groups={[group]}
        fixedGroupId={group.id}
      />
    </section>
  );
}
