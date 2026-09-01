'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CreateTopicModal } from '@/components/groups/CreateTopicModal';
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

  const topics = allTopics?.filter((t) => t.group_id === group.id);

  const handleDelete = async (topicId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setError(null);
    try {
      await deleteTopic.mutateAsync(topicId);
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
                  onClick={() => handleDelete(topic.id, topic.title)}
                  disabled={deleteTopic.isPending}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <CreateTopicModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        groups={[group]}
        fixedGroupId={group.id}
      />
    </section>
  );
}
