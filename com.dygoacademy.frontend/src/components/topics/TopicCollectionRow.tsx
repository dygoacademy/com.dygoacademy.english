import Link from 'next/link';

import { MasteryRing } from '@/components/topics/MasteryRing';
import { formatTopicWordCount } from '@/lib/utils';
import type { TopicSummary } from '@/types';

/**
 * Phase 9, "Topics as Collections" (`phase 9 implementation plan.md`) —
 * a vertical list row, sibling to `TopicGridCard.tsx` rather than a
 * restyle of it in place. `(dashboard)/page.tsx`'s Home still uses the
 * flat `TopicCard.tsx`, a third, different component; none of the three
 * should silently change shape by editing one of the others.
 *
 * Leads with a larger `MasteryRing` (36px vs. the grid tile's default
 * 28px) instead of the ring sharing a line with the title — the point of
 * this restyle is completion state as the first thing read, not a
 * word count. `MasteryRing` itself is untouched; it already took a
 * `size` prop.
 *
 * Subtext gained "· M focus words" 2026-09-21, matching the mockup's own
 * "21 words · 3 focus words" — see `formatTopicWordCount`'s own comment
 * for why that formatting is shared, not re-derived here.
 */
export function TopicCollectionRow({ topic }: { topic: TopicSummary }) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      className="flex items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/40"
    >
      <MasteryRing masteredCount={topic.mastered_count} wordCount={topic.word_count} size={36} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium leading-snug">{topic.title}</span>
        <span className="text-xs text-muted-foreground">
          {formatTopicWordCount(topic.word_count, topic.focus_word_count)}
        </span>
      </div>
      {topic.is_public && (
        <span className="shrink-0 self-start rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          public
        </span>
      )}
    </Link>
  );
}
