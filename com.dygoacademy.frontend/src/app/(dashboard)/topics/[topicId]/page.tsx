'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AddWordModal } from '@/components/topics/AddWordModal';
import { Button } from '@/components/ui/button';
import { EmptyTopicState } from '@/components/topics/EmptyTopicState';
import { WordStatusRow } from '@/components/topics/WordStatusRow';
import { useTopic } from '@/hooks/useTopic';

/**
 * Topic detail — wireframes 1j (empty), 1k (enriching), 1l (failed).
 *
 * Was built against `GET /api/v1/topics` (list) plus a client-side find,
 * with the word list itself mocked, because `GET /topics/:id` didn't exist
 * yet. It's live now (topics.service.ts `findById`, Module 1) and returns
 * real `words[]` with real status — this page now polls it directly via
 * useTopic rather than reaching into the list query.
 */
export default function TopicDetailPage() {
  const params = useParams<{ topicId: string }>();
  const { data: topic, isPending, isError } = useTopic(params.topicId);
  const [addWordOpen, setAddWordOpen] = useState(false);

  if (isPending) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  if (isError || !topic) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          {isError ? "Couldn't load this topic right now." : 'Topic not found.'}
        </p>
        <Link href="/topics" className="text-sm underline underline-offset-4">
          Back to topics
        </Link>
      </div>
    );
  }

  const isEmpty = topic.words.length === 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-6">
      <Link href="/topics" className="text-xs text-muted-foreground underline underline-offset-4">
        ← Your topics
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{topic.title}</h1>
        {!isEmpty && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/study?topicId=${topic.id}`}>Study</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/quiz?topicId=${topic.id}`}>Quiz</Link>
            </Button>
            <Button size="sm" onClick={() => setAddWordOpen(true)}>
              + Add a word
            </Button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <EmptyTopicState onAddWord={() => setAddWordOpen(true)} />
      ) : (
        <div className="flex flex-col gap-2">
          {topic.words.map((word) => (
            <WordStatusRow key={word.id} word={word} topicId={topic.id} />
          ))}
        </div>
      )}

      <AddWordModal topicId={topic.id} open={addWordOpen} onOpenChange={setAddWordOpen} />
    </div>
  );
}
