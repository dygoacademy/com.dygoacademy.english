import Link from 'next/link';

import type { TopicSummary } from '@/types';

/**
 * Wireframe 1f's 2x2 grid tile. Deliberately shows only word_count (real,
 * from GET /api/v1/topics) and not a per-topic "N due" chip — the
 * wireframe shows one, but that's per-topic SRS data (GET /srs/due,
 * Phase 2) we don't have yet. One honestly-labeled mock number on the
 * home screen's aggregate DueNowCard is a reasonable stand-in; five
 * different specific-looking fake numbers across a grid of real topics
 * is not — that reads as real data to anyone glancing at it.
 */
export function TopicGridCard({ topic }: { topic: TopicSummary }) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      className="flex flex-col gap-1.5 rounded-xl border p-3.5 hover:bg-muted/40"
    >
      <span className="text-sm font-medium leading-snug">{topic.title}</span>
      <span className="text-xs text-muted-foreground">
        {topic.word_count} {Number(topic.word_count) === 1 ? 'word' : 'words'}
      </span>
      {topic.is_public && (
        <span className="mt-1 self-start rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          public
        </span>
      )}
    </Link>
  );
}
