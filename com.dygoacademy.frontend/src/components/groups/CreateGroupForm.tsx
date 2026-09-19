'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useCreateGroup } from '@/hooks/useGroups';
import { ApiError } from '@/lib/api-client';

/**
 * Wireframe 3b — "Create a group." A plain inline form, not a modal: the
 * groups list page is short enough that pushing the create form into an
 * overlay would cost a click for no real benefit, unlike AddWordModal's
 * overlay which sits on top of an already-busy topic detail page.
 */
export function CreateGroupForm({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createGroup = useCreateGroup();

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        + Create a group
      </Button>
    );
  }

  const close = () => {
    setOpen(false);
    setName('');
    setDescription('');
    setIsPublic(false);
    setError(null);
    createGroup.reset();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);
    try {
      await createGroup.mutateAsync({
        name: trimmed,
        description: description.trim() || undefined,
        isPublic,
      });
      close();
      onCreated?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not create this group. Try again.',
      );
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="text-sm font-semibold">Create a group</h2>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Sarah's IELTS Cohort"
        maxLength={120}
        aria-label="Group name"
        className="rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        maxLength={2000}
        rows={2}
        aria-label="Group description"
        className="resize-none rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        Public — discoverable, and its topics are cloneable by other groups
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={!name.trim() || createGroup.isPending}>
          {createGroup.isPending ? 'Creating…' : 'Create group'}
        </Button>
      </div>
    </form>
  );
}
