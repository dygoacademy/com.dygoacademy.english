import Link from 'next/link';

import { MasteryRing } from '@/components/topics/MasteryRing';
import { formatTopicWordCount } from '@/lib/utils';
import type { TopicSummary } from '@/types';

/**
 * Wireframe 1f's 2x2 grid tile. Originally showed only word_count (real,
 * from GET /api/v1/topics) and not a per-topic "N due" chip — the
 * wireframe showed one, but that was per-topic SRS data we didn't have
 * yet. That gap is closed 2026-09-20 (Phase 3 Module 19, FR-19.1): a
 * mastery ring, backed by the same real `mastered_count` field the
 * backend now returns, not a mock number — the original caution above
 * about not showing "specific-looking fake numbers" still applies, this
 * one just isn't fake anymore.
 */
export function TopicGridCard({ topic }: { topic: TopicSummary }) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      className="flex flex-col gap-1.5 rounded-xl border p-3.5 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug">{topic.title}</span>
        <MasteryRing masteredCount={topic.mastered_count} wordCount={topic.word_count} />
      </div>
      <span className="text-xs text-muted-foreground">
        {formatTopicWordCount(topic.word_count, topic.focus_word_count)}
      </span>
      {topic.is_public && (
        <span className="mt-1 self-start rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          public
        </span>
      )}
    </Link>
  );
}
