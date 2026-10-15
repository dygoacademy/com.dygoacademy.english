'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { apiClient } from '@/lib/api-client';
import type { TopicSummary } from '@/types';

/**
 * The first real data hook, per the architecture doc's extension
 * checklist (§14) — one hook per resource, built on apiClient +
 * TanStack Query, never apiClient calls scattered through components.
 * GET /api/v1/topics is the one endpoint actually live as of Phase 0
 * (see docs/architecture/dygo_academy_api_surface.md §"Live today"); RLS on the backend
 * does the tenant/membership filtering, so this always returns exactly
 * what the signed-in caller may see.
 */
export function useTopics() {
  // The My words bed is stored as "My words"; show it in the learner's language.
  const t = useTranslations('screens.topics');
  const myWords = t('myWords');
  const select = useCallback(
    (topics: TopicSummary[]) =>
      topics.map((topic) => (topic.is_my_words ? { ...topic, title: myWords } : topic)),
    [myWords],
  );
  return useQuery({
    queryKey: ['topics'],
    queryFn: () => apiClient.get<TopicSummary[]>('/topics'),
    select,
  });
}
