'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useDeleteGroup, useUpdateGroup } from '@/hooks/useGroups';
import { ApiError } from '@/lib/api-client';
import type { GroupSummary } from '@/types';

/** ADMIN-only rename/visibility/delete — folded into the detail page rather than a separate route. */
export function GroupSettingsPanel({ group }: { group: GroupSummary }) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [isPublic, setIsPublic] = useState(group.is_public);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const updateGroup = useUpdateGroup(group.id);
  const deleteGroup = useDeleteGroup();

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

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${group.name}"? This removes every topic and member in it.`)) {
      return;
    }
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
      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && !dirty && <p className="text-xs text-muted-foreground">Saved.</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!name.trim() || !dirty || updateGroup.isPending}
        >
          {updateGroup.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteGroup.isPending}
        >
          Delete group
        </Button>
      </div>
    </section>
  );
}
