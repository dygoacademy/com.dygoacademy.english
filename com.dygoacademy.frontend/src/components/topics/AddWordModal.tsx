'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { useCreateWord } from '@/hooks/useCreateWord';

/**
 * Wireframe follow-up to 1j/1k — the "+ Add a word" action that was
 * `disabled` behind a "Phase 1" label in EmptyTopicState until Module 2's
 * ingestion endpoint existed. Deliberately not a full dialog primitive
 * (no Radix dependency in the project yet, see components/ui/) — a fixed
 * overlay + a single input is the whole interaction FR-2.1 asks for.
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

  if (!open) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Add a word"
      onClick={close}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-t-2xl border bg-card p-5 shadow-lg sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">Add a word</h2>
        <p className="text-xs text-muted-foreground">
          IPA, audio, synonyms and example sentences arrive on their own.
        </p>
        <input
          autoFocus
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="e.g. resilient"
          maxLength={100}
          className="rounded-xl border-2 border-primary bg-transparent px-3 py-2.5 text-lg outline-none"
          aria-label="Word to add"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="mt-1 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={!word.trim() || createWord.isPending}>
            {createWord.isPending ? 'Adding…' : 'Add word'}
          </Button>
        </div>
      </form>
    </div>
  );
}
