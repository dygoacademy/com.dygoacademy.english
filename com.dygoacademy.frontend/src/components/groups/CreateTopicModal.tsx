'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTopic } from '@/hooks/useTopicMutations';
import { ApiError } from '@/lib/api-client';
import type { GroupSummary } from '@/types';

/**
 * Wireframe 4a — "Create a topic." Migrated 2026-09-05 onto shadcn/ui's
 * Dialog/Input/Select/Textarea (see AddWordModal.tsx's comment for why —
 * same hand-rolled-overlay pattern, same reasons to move off it). The
 * group picker in particular moves from a plain native `<select>` to
 * Radix's Select, which is what components.json/the tech spec actually
 * called for under "shadcn/ui primitives ... dialog, etc." — a gap
 * flagged 2026-09-05 (only button.tsx/card.tsx had ever been scaffolded).
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

  const close = () => {
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent hideClose>
        <DialogTitle>New topic</DialogTitle>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {!fixedGroupId && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topic-group" className="sr-only">
                Group
              </Label>
              <Select value={groupId} onValueChange={setGroupId} disabled={groups.length === 0}>
                <SelectTrigger id="topic-group">
                  <SelectValue placeholder="No eligible groups" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Label htmlFor="topic-title" className="sr-only">
            Topic title
          </Label>
          <Input
            id="topic-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Phrasal Verbs — Business English"
            maxLength={200}
            className="text-lg"
          />

          <Label htmlFor="topic-description" className="sr-only">
            Topic description
          </Label>
          <Textarea
            id="topic-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            maxLength={2000}
            rows={2}
          />

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Public — discoverable and cloneable by other groups (FR-1.1)
          </label>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
