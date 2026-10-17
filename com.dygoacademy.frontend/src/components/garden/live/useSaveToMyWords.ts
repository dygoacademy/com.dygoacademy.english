'use client';

import { useGroups } from '@/hooks/useGroups';
import { useTopics } from '@/hooks/useTopics';

import type { AddWordBed } from '../AddWordSheet';
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

/**
 * The bed chips on A7b Add word (2026-10-17): the beds the learner can add
 * words to, this bed first (or My words first when this bed can't be
 * edited, as `useSaveToMyWords` decides), then My words, then their other
 * beds in GET /topics order. Group beds count only where their role isn't
 * READ. My words is `id: null` until the learner has that bed. Empty while
 * GET /topics loads (the sheet then plants in this bed or My words alone).
 */
export function useAddWordBeds(topicId: string, bedTitle: string, myWordsTitle: string) {
  const topics = useTopics();
  const groups = useGroups();
  const saveToMyWords = useSaveToMyWords(topicId);
  const list = (topics.data as GardenTopicSummary[] | undefined) ?? [];
  if (list.length === 0) return [];

  const writable = (t: GardenTopicSummary) => {
    if (t.is_my_words || t.kind === 'mine') return true;
    if (t.kind !== 'group') return false;
    const group = groups.data?.find((g) => g.id === t.group_id);
    return Boolean(group && group.role !== 'READ');
  };
  const myWords = list.find((t) => t.is_my_words);
  const beds: AddWordBed[] = [];
  const add = (bed: AddWordBed) => {
    if (!beds.some((b) => b.id === bed.id)) beds.push(bed);
  };
  if (!saveToMyWords) add({ id: topicId, title: bedTitle });
  add(myWords ? { id: myWords.id, title: myWords.title } : { id: null, title: myWordsTitle });
  for (const t of list) if (writable(t)) add({ id: t.id, title: t.title });
  return beds;
}
