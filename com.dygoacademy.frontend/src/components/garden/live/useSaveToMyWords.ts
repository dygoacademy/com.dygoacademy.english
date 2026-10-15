'use client';

import { useGroups } from '@/hooks/useGroups';
import { useTopics } from '@/hooks/useTopics';

import type { GardenTopicSummary } from './data';

/**
 * Whether + on this bed should save to the learner's My words bed instead:
 * true on a bed they can't edit, i.e. a library bed or a group bed where
 * they're READ (fix plan 2026-10-15; before, + failed there with the
 * server's "WRITE role" error). From `GET /topics` (`kind`) and `GET
 * /groups` (`role`); false while either is loading, so + behaves as
 * before until we know.
 */
export function useSaveToMyWords(topicId: string): boolean {
  const topics = useTopics();
  const groups = useGroups();
  const topic = (topics.data as GardenTopicSummary[] | undefined)?.find((t) => t.id === topicId);
  if (!topic || topic.is_my_words || topic.kind === 'mine') return false;
  if (topic.kind === 'library') return true;
  if (topic.kind !== 'group' || !groups.data) return false;
  const group = groups.data.find((g) => g.id === topic.group_id);
  return !group || group.role === 'READ';
}

/** The bed's name for its header: My words in the learner's language, else `title`. */
export function useBedTitle(topicId: string, title: string): string {
  const topics = useTopics();
  const topic = topics.data?.find((t) => t.id === topicId);
  return topic?.is_my_words ? topic.title : title;
}
