'use client';

import { DueNowCard } from '@/components/topics/DueNowCard';
import { LeechNudge } from '@/components/topics/LeechNudge';
import { TopicCard } from '@/components/topics/TopicCard';
import { Button } from '@/components/ui/button';
import { useTopics } from '@/hooks/useTopics';

/**
 * Wireframe 1d — "one decision on open." Chosen over 1e (today-as-a-
 * checklist) for the home screen. 1f (topics-first grid) was explicitly
 * captioned by the source design as "kept for comparison... second tab,
 * not the front door" — not built here for that reason, not by omission.
 *
 * dueCount, etaMinutes, streakDays and the leech count are mock: they
 * depend on GET /srs/due, /srs/stats, /srs/leeches, all Phase 2 (Module
 * 3). "Your Topics" below is the one section backed by real data — see
 * hooks/useTopics.ts.
 */
export default function TopicsHomePage() {
  const { data: topics, isPending, isError } = useTopics();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Welcome back</h1>
        <span className="rounded-full border px-2.5 py-1 text-xs">12-day streak</span>
      </div>

      <DueNowCard dueCount={12} etaMinutes={4} />

      <Button variant="outline" disabled>
        + Add a word · Phase 1
      </Button>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Your topics
        </p>

        {isPending && (
          <div className="space-y-2">
            <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load your topics right now. Check that the API is running.
          </p>
        )}

        {topics?.length === 0 && (
          <p className="text-sm text-muted-foreground">No topics yet.</p>
        )}

        {topics?.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
      </div>

      <LeechNudge count={2} />
    </div>
  );
}
