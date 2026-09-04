'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { AddWordModal } from '@/components/topics/AddWordModal';
import { Button } from '@/components/ui/button';
import { EmptyTopicState } from '@/components/topics/EmptyTopicState';
import { WordStatusRow } from '@/components/topics/WordStatusRow';
import { ROUTES } from '@/constants/routes';
import { useDeleteTopic } from '@/hooks/useTopicMutations';
import { useGroups } from '@/hooks/useGroups';
import { useTopic } from '@/hooks/useTopic';
import { ApiError } from '@/lib/api-client';

/**
 * Topic detail — wireframes 1j (empty), 1k (enriching), 1l (failed).
 *
 * Was built against `GET /api/v1/topics` (list) plus a client-side find,
 * with the word list itself mocked, because `GET /topics/:id` didn't exist
 * yet. It's live now (topics.service.ts `findById`, Module 1) and returns
 * real `words[]` with real status — this page now polls it directly via
 * useTopic rather than reaching into the list query.
 *
 * Delete added 2026-09-04: `useDeleteTopic()` already existed
 * (useTopicMutations.ts) and was wired into GroupTopicsPanel, but this
 * page — the other place someone naturally lands on a topic — had no way
 * to trigger it at all. Same ADMIN-gating and confirm-dialog pattern as
 * GroupTopicsPanel, since `topics_delete_admin` is the same RLS policy
 * either caller hits; `GET /topics/:id` doesn't return the caller's role
 * in the topic's group, so `useGroups()` is queried here too, same as the
 * group detail page, to find it.
 */
export default function TopicDetailPage() {
  const params = useParams<{ topicId: string }>();
  const router = useRouter();
  const { data: topic, isPending, isError } = useTopic(params.topicId);
  const { data: groups } = useGroups();
  const deleteTopic = useDeleteTopic();
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isPending) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  if (isError || !topic) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          {isError ? "Couldn't load this topic right now." : 'Topic not found.'}
        </p>
        <Link href="/topics" className="text-sm underline underline-offset-4">
          Back to topics
        </Link>
      </div>
    );
  }

  const isEmpty = topic.words.length === 0;
  const canManage = groups?.find((g) => g.id === topic.group_id)?.role === 'ADMIN';

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${topic.title}"? This can't be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteTopic.mutateAsync(topic.id);
      router.push(ROUTES.groupDetail(topic.group_id));
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this topic.');
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-6">
      <Link href="/topics" className="text-xs text-muted-foreground underline underline-offset-4">
        ← Your topics
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{topic.title}</h1>
        {!isEmpty && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/study?topicId=${topic.id}`}>Study</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/quiz?topicId=${topic.id}`}>Quiz</Link>
            </Button>
            <Button size="sm" onClick={() => setAddWordOpen(true)}>
              + Add a word
            </Button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <EmptyTopicState onAddWord={() => setAddWordOpen(true)} />
      ) : (
        <div className="flex flex-col gap-2">
          {topic.words.map((word) => (
            <WordStatusRow key={word.id} word={word} topicId={topic.id} />
          ))}
        </div>
      )}

      <AddWordModal topicId={topic.id} open={addWordOpen} onOpenChange={setAddWordOpen} />

      {/* Moved to the bottom, separated from the primary actions above —
          a destructive, irreversible action sitting next to frequently-used
          ones (Study/Quiz/Add word) invites a misclick. */}
      {canManage && (
        <div className="mt-4 border-t pt-4">
          {deleteError && <p className="mb-2 text-xs text-destructive">{deleteError}</p>}
          <Button size="sm" onClick={handleDelete} disabled={deleteTopic.isPending}>
            Delete this topic
          </Button>
        </div>
      )}
    </div>
  );
}
