'use client';

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { QuizHint } from '@/types';

/**
 * `GET /api/v1/quizzes/:id/hint` (FR-5.x follow-up — live-requested
 * 2026-09-16, "when I do the fill in blank I don't know which word should
 * be fill in ... some suggestion like IPA and explain meaning"). A GET
 * modeled as `useMutation` rather than `useQuery` — the mirror image of
 * `useStudySession`'s POST-as-`useQuery` (see that hook's comment): this
 * request has no side effects either, but it's fetched imperatively when
 * the student taps "Need a hint?", not automatically whenever the
 * component holding an itemId renders. `useQuery` would need `enabled:
 * false` plus a manual `refetch()` per item id to get the same one-shot,
 * on-demand behavior `useMutation` gives for free.
 */
export function useQuizHint() {
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient.get<QuizHint>(`/quizzes/${encodeURIComponent(itemId)}/hint`),
  });
}
