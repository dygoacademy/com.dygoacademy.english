'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import { useCreateWord } from '@/hooks/useCreateWord';

/**
 * Wireframe follow-up to 1j/1k — the "+ Add a word" action that was
 * `disabled` behind a "Phase 1" label in EmptyTopicState until Module 2's
 * ingestion endpoint existed.
 *
 * Migrated 2026-09-05 onto shadcn/ui's Dialog (components/ui/dialog.tsx)
 * instead of the hand-rolled fixed-overlay `<div role="dialog">` this used
 * to be -- that pattern (shared with CreateTopicModal and WordCardModal)
 * needed its own centering fix, its own iOS-zoom fix, and its own
 * blur-before-close patch, each applied per modal as it was noticed. A
 * real Dialog primitive gets all three for free, for this modal and any
 * future one.
 */
export function AddWordModal({
  topicId,
  open,
  onOpenChange,
}: {
  topicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createWord = useCreateWord(topicId);

  const close = () => {
    setWord('');
    setError(null);
    createWord.reset();
    onOpenChange(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = word.trim();
    if (!trimmed) return;

    setError(null);
    try {
      await createWord.mutateAsync({ word: trimmed });
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this word. Try again.');
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
        <DialogTitle>Add a word</DialogTitle>
        <p className="text-xs text-muted-foreground">
          IPA, audio, synonyms and example sentences arrive on their own.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Label htmlFor="add-word-input" className="sr-only">
            Word to add
          </Label>
          <Input
            id="add-word-input"
            autoFocus
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. resilient"
            maxLength={100}
            className="text-lg"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" className="flex-1" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!word.trim() || createWord.isPending}>
              {createWord.isPending ? 'Adding…' : 'Add word'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
