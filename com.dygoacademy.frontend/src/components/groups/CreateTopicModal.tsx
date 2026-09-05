'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { blurActiveElement } from '@/lib/utils';
import { useCreateTopic } from '@/hooks/useTopicMutations';
import { ApiError } from '@/lib/api-client';
import type { GroupSummary } from '@/types';

/**
 * Wireframe 4a — "Create a topic." Same fixed-overlay pattern as
 * AddWordModal (no Radix dialog primitive in this project). The
 * topics/browse "+ New Topic" tile has read "· Phase 1" since turn 1f;
 * this is what makes it real, alongside the group detail page's own
 * button (which pre-selects that group and hides the picker — one click
 * fewer when the target group is unambiguous).
 *
 * `groups` is pre-filtered by the caller to WRITE/ADMIN memberships only
 * — `POST /topics` requires WRITE on the target group
 * (`topics_insert_write`), so a READ-only group would just 403 if offered
 * here.
 */
export function CreateTopicModal({
  open,
  onOpenChange,
  groups,
  fixedGroupId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupSummary[];
  fixedGroupId?: string;
}) {
  const [groupId, setGroupId] = useState(fixedGroupId ?? groups[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createTopic = useCreateTopic();

  if (!open) return null;

  const close = () => {
    blurActiveElement();
    setTitle('');
    setDescription('');
    setIsPublic(false);
    setError(null);
    createTopic.reset();
    onOpenChange(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    const target = fixedGroupId ?? groupId;
    if (!trimmed || !target) return;

    setError(null);
    try {
      await createTopic.mutateAsync({
        groupId: target,
        title: trimmed,
        description: description.trim() || undefined,
        isPublic,
      });
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this topic. Try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create a topic"
      onClick={close}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border bg-card p-5 shadow-lg"
      >
        <h2 className="text-lg font-semibold">New topic</h2>

        {!fixedGroupId && (
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            aria-label="Group"
            // text-base (16px), not text-sm (14px): iOS Safari auto-zooms
            // the whole page on focus for any form field under 16px, and
            // doesn't zoom back out on its own (live-reported 2026-09-05,
            // "the pop-up... make screen zoom in"). Same fix on the
            // textarea below -- the title input was already text-lg and
            // never triggered this.
            className="rounded-md border px-3 py-2 text-base outline-none focus:border-primary"
          >
            {groups.length === 0 && <option value="">No eligible groups</option>}
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Phrasal Verbs — Business English"
          maxLength={200}
          aria-label="Topic title"
          className="rounded-xl border-2 border-primary bg-transparent px-3 py-2.5 text-lg outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          maxLength={2000}
          rows={2}
          aria-label="Topic description"
          className="resize-none rounded-md border px-3 py-2 text-base outline-none focus:border-primary"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public — discoverable and cloneable by other groups (FR-1.1)
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="mt-1 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={!title.trim() || !(fixedGroupId ?? groupId) || createTopic.isPending}
          >
            {createTopic.isPending ? 'Creating…' : 'Create topic'}
          </Button>
        </div>
      </form>
    </div>
  );
}
