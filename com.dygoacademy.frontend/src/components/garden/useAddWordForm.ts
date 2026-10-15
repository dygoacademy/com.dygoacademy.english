'use client';

import { useState } from 'react';

import { useCreateWord } from '@/hooks/useCreateWord';
import { ApiError } from '@/lib/api-client';

export interface AddWordFormMessages {
  /** Any failure without a friendlier line below. */
  fallbackError: string;
  /** 403: the learner can't add words to this bed. */
  forbiddenError?: string;
  /** 409: the word is already in the bed. */
  duplicateError?: string;
}

/**
 * The "add a word to this topic" form logic, garden-owned (UI-5 U5-4).
 * Same behaviour as the classic add-word modal (deleted in UI-8): trim,
 * ignore empty input, POST /words through `useCreateWord`, clear on close.
 * A null `topicId` saves to the learner's My words bed. Failures show a
 * translated line (2026-10-15: a 403 / 409 used to show the server's
 * English text, e.g. "WRITE role on this topic is required.").
 */
export function useAddWordForm(
  topicId: string | null,
  {
    fallbackError,
    forbiddenError,
    duplicateError,
    onAdded,
  }: AddWordFormMessages & { onAdded?: () => void },
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
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        (status === 403 && forbiddenError) || (status === 409 && duplicateError) || fallbackError,
      );
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
