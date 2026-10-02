'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

/**
 * DELETE /api/v1/words/:id — the trash icon on each word row
 * (the classic word row), live-requested 2026-09-18 ("How to delete word in
 * the topics?"). `topic_words_delete_write` (002_rls_policies.sql) already
 * required WRITE role on the topic for this to succeed — same "the RLS
 * policy existed, the frontend never called it" gap useDeleteTopic's own
 * comment describes for topics. Mirrors useDeleteTopic's invalidation
 * shape: the row disappears from `useTopic`'s cached `words[]` as soon as
 * the topic-detail query is refetched.
 */
export function useDeleteWord(topicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topicWordId: string) => apiClient.delete<void>(`/words/${topicWordId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['topics', topicId] });
    },
  });
}
