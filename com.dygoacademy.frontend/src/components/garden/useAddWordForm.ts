'use client';

import { useState } from 'react';

import { useCreateWord } from '@/hooks/useCreateWord';
import { ApiError } from '@/lib/api-client';

/**
 * The "add a word to this topic" form logic, garden-owned (UI-5 U5-4).
 * Same behaviour as the classic add-word modal (deleted in UI-8)
 * (left unchanged): trim, ignore empty input, POST /words through
 * `useCreateWord`, show the API's message on failure, clear on close.
 * `fallbackError` is the translated message for non-API failures.
 */
export function useAddWordForm(
  topicId: string,
  { fallbackError, onAdded }: { fallbackError: string; onAdded?: () => void },
) {
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createWord = useCreateWord(topicId);

  function reset() {
    setWord('');
    setError(null);
    createWord.reset();
  }

  async function submit() {
    const trimmed = word.trim();
    if (!trimmed || createWord.isPending) return;
    setError(null);
    try {
      await createWord.mutateAsync({ word: trimmed });
      reset();
      onAdded?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallbackError);
    }
  }

  return {
    word,
    setWord,
    error,
    busy: createWord.isPending,
    canSubmit: word.trim().length > 0 && !createWord.isPending,
    submit,
    reset,
  };
}
