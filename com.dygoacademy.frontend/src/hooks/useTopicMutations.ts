'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { Topic, TopicRow } from '@/types';

export interface CreateTopicInput {
  /** Left out, the bed goes in the learner's personal group (My words). */
  groupId?: string;
  title: string;
  description?: string;
  isPublic?: boolean;
}

/**
 * POST /api/v1/topics — mirrors CreateTopicDto exactly. The topics/browse
 * page's "+ New Topic" tile has said "· Phase 1" since turn 1/1f; this is
 * what makes it real, alongside the group detail page's own "New topic"
 * button.
 */
export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTopicInput) => apiClient.post<TopicRow>('/topics', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

export interface UpdateTopicInput {
  title?: string;
  description?: string;
  isPublic?: boolean;
}

/** PATCH /api/v1/topics/:id — WRITE on the topic's group. */
export function useUpdateTopic(topicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTopicInput) => apiClient.patch<TopicRow>(`/topics/${topicId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['topics'] });
      void queryClient.invalidateQueries({ queryKey: ['topics', topicId] });
    },
  });
}

/**
 * DELETE /api/v1/topics/:id — ADMIN only (topics_delete_admin). The
 * frontend never rendered a delete button at all before this pass (checked
 * during the fifth pass's own last-ADMIN-guard work — "no delete-topic
 * button exists anywhere in the running frontend yet"), so this closes
 * both halves of that gap: the RLS policy already existed, this is the
 * first caller.
 */
export function useDeleteTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topicId: string) => apiClient.delete<void>(`/topics/${topicId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

export interface CloneTopicInput {
  topicId: string;
  targetGroupId: string;
}

/** POST /api/v1/topics/:id/clone — FR-1.1, "public topics are cloneable." */
export function useCloneTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicId, targetGroupId }: CloneTopicInput) =>
      apiClient.post<TopicRow>(`/topics/${topicId}/clone`, { targetGroupId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

/** Re-export for callers that only need the response shape. */
export type { Topic };
