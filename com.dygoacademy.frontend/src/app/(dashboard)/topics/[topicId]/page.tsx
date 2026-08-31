'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { EmptyTopicState } from '@/components/topics/EmptyTopicState';
import { WordStatusRow } from '@/components/topics/WordStatusRow';
import { useTopics } from '@/hooks/useTopics';
import type { TopicWord } from '@/types';

/**
 * Topic detail — wireframes 1j (empty), 1k (enriching), 1l (failed).
 *
 * Title and word count come from the real GET /api/v1/topics response
 * (found by id, client-side — there's no GET /topics/:id yet). Whether
 * to show the empty state is therefore a REAL decision, driven by real
 * data: `word_count === '0'`. The word list itself, when non-empty, is a
 * labeled preview — GET /topics/:topicId/words (tech spec §"Module 2")
 * doesn't exist until Phase 1, so there's nothing real to show yet, and
 * pretending otherwise under a real topic id would be more misleading
 * than a clearly marked mock.
 */
const MOCK_WORDS: TopicWord[] = [
  {
    id: 'mock-word-1',
    topic_id: 'mock',
    lexicon_id: null,
    source_word: 'serendipity',
    language_code: 'en',
    status: 'ENRICHING',
    custom_note: null,
    added_by: null,
    failure_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-word-2',
    topic_id: 'mock',
    lexicon_id: null,
    source_word: 'flibbertigibbet',
    language_code: 'en',
    status: 'FAILED',
    custom_note: null,
    added_by: null,
    failure_reason: 'No pronunciation source found',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-word-3',
    topic_id: 'mock',
    lexicon_id: 'mock-lexicon',
    source_word: 'meticulous',
    language_code: 'en',
    status: 'READY',
    custom_note: null,
    added_by: null,
    failure_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function TopicDetailPage() {
  const params = useParams<{ topicId: string }>();
  const { data: topics, isPending, isError } = useTopics();

  if (isPending) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  if (isError) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Couldn&apos;t load this topic right now.
      </p>
    );
  }

  const topic = topics?.find((t) => t.id === params.topicId);

  if (!topic) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Topic not found.</p>
        <Link href="/topics" className="text-sm underline underline-offset-4">
          Back to topics
        </Link>
      </div>
    );
  }

  const isEmpty = Number(topic.word_count) === 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-6">
      <Link href="/topics" className="text-xs text-muted-foreground underline underline-offset-4">
        ← Your topics
      </Link>
      <h1 className="text-lg font-semibold">{topic.title}</h1>

      {isEmpty ? (
        <EmptyTopicState />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Preview data — GET /topics/:topicId/words ships in Phase 1. This topic really has{' '}
            {topic.word_count} word{Number(topic.word_count) === 1 ? '' : 's'}.
          </p>
          {MOCK_WORDS.map((word) => (
            <WordStatusRow key={word.id} word={word} />
          ))}
        </div>
      )}
    </div>
  );
}
