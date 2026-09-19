import Link from 'next/link';

import { MasteryRing } from '@/components/topics/MasteryRing';
import type { TopicSummary } from '@/types';

/**
 * One row in "Your Topics" (wireframe 1d). Real data — GET /api/v1/topics
 * is live. Mastery ring added 2026-09-20 (Phase 3 Module 19, FR-19.1),
 * alongside the existing word count rather than replacing it.
 */
export function TopicCard({ topic }: { topic: TopicSummary }) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm hover:bg-muted/40"
    >
      <span>{topic.title}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {topic.word_count} {Number(topic.word_count) === 1 ? 'word' : 'words'}
        </span>
        <MasteryRing masteredCount={topic.mastered_count} wordCount={topic.word_count} />
      </span>
    </Link>
  );
}
