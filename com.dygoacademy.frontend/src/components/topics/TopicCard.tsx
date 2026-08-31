import Link from 'next/link';

import type { TopicSummary } from '@/types';

/** One row in "Your Topics" (wireframe 1d). Real data — GET /api/v1/topics is live. */
export function TopicCard({ topic }: { topic: TopicSummary }) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm hover:bg-muted/40"
    >
      <span>{topic.title}</span>
      <span className="font-mono text-xs text-muted-foreground">
        {topic.word_count} {Number(topic.word_count) === 1 ? 'word' : 'words'}
      </span>
    </Link>
  );
}
