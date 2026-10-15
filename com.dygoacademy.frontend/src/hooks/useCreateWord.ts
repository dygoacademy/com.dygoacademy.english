'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { CefrLevel, TopicWord } from '@/types';

export interface CreateWordInput {
  /** Left out, the word goes in the learner's My words bed. */
  topicId?: string;
  word: string;
  languageCode?: string;
  targetCEFR?: CefrLevel;
}

/**
 * POST /api/v1/words — mirrors CreateWordDto exactly
 * (com.dygoacademy.backend/src/modules/words/dto/create-word.dto.ts).
 * Returns 201 with status ENRICHING immediately (<50ms SLO); the enriched
 * result lands asynchronously and is picked up by useTopic's polling once
 * this invalidates the topic query.
 */
export function useCreateWord(topicId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateWordInput, 'topicId'>) =>
      apiClient.post<TopicWord>('/words', topicId ? { topicId, ...input } : input),
    onSuccess: (word) => {
      if (!topicId) {
        // Saved to My words: that bed and the list changed, not this bed.
        void queryClient.invalidateQueries({ queryKey: ['topics', word.topic_id] });
        void queryClient.invalidateQueries({ queryKey: ['topics'], exact: true });
        return;
      }
      // Refetches topic detail (new ENRICHING row) and the topics list
      // (word_count changed) rather than hand-patching the cache — Module 2
      // writes land through a queue worker anyway, so the cache is never
      // more than "optimistically wrong for a moment" either way.
      void queryClient.invalidateQueries({ queryKey: ['topics', topicId] });
      void queryClient.invalidateQueries({ queryKey: ['topics'], exact: true });
    },
  });
}
