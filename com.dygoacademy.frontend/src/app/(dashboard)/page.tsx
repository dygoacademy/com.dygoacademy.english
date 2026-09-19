'use client';

import { DueNowCard } from '@/components/topics/DueNowCard';
import { LeechNudge } from '@/components/topics/LeechNudge';
import { TopicCard } from '@/components/topics/TopicCard';
import { useLeeches } from '@/hooks/useLeeches';
import { useSrsStats } from '@/hooks/useSrsStats';
import { useTopics } from '@/hooks/useTopics';
import { CONTENT_WIDTH } from '@/constants/layout';

/**
 * Wireframe 1d — "one decision on open." Chosen over 1e (today-as-a-
 * checklist) for the home screen. 1f (topics-first grid) was explicitly
 * captioned by the source design as "kept for comparison... second tab,
 * not the front door" — not built here for that reason, not by omission.
 *
 * Lives at "/" (bare root of the signed-in (dashboard) route group) since
 * the 2026-09-17 URL reshuffle — was `(dashboard)/topics/page.tsx` before
 * that, back when the front door and the topics grid shared the "/topics"
 * prefix. The grid moved to `(dashboard)/topics/page.tsx` in its place;
 * see constants/routes.ts's header for the full picture.
 *
 * Streak/due/leech numbers were mock literals ("12-day streak",
 * `dueCount={12}`, `LeechNudge count={2}`) left over from this page's
 * original wireframe-to-code pass — `GET /srs/stats`/`/srs/leeches` have
 * been live backend routes since Phase 2, and `(dashboard)/analytics`
 * already called them correctly; this page just never got the same wiring.
 * Phase 2 FR-9.1/9.2/9.3 (live UX audit, 2026-09-19) named the resulting
 * bug directly: Home and Progress showed *different* streak/due numbers
 * for the same account at the same instant, and the leech nudge's count
 * could disagree with its own "Fix →" destination. Fixed here by reusing
 * `useSrsStats()`/`useLeeches()` — the exact hooks `analytics/page.tsx`
 * already uses — rather than inventing a third source. "Your Topics"
 * below was already the one section backed by real data — see
 * hooks/useTopics.ts.
 *
 * The disabled "+ Add a word · Phase 1" button (FR-15.1: a dead control
 * carrying an internal build-phase label) is removed rather than wired up
 * here — the real "Add a word" flow (AddWordModal) needs a specific
 * topicId to add into, and Home has no topic context to hand it one
 * without a new topic-picker UI, which is new scope beyond this
 * remediation. Adding a word from a specific topic already works today,
 * on that topic's own page.
 */
export default function TopicsHomePage() {
  const { data: topics, isPending, isError } = useTopics();
  const { data: stats, isPending: statsPending, isError: statsError } = useSrsStats();
  const { data: leeches } = useLeeches();

  return (
    <div className={`mx-auto flex ${CONTENT_WIDTH.default} flex-col gap-4 p-6`}>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Welcome back</h1>
        {stats && (
          <span className="rounded-full border px-2.5 py-1 text-xs">
            {stats.current_streak_days}-day streak
          </span>
        )}
      </div>

      {statsPending && <div className="h-32 w-full animate-pulse rounded-xl bg-muted" />}
      {statsError && (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your due count right now. Check that the API is running.
        </p>
      )}
      {stats && <DueNowCard dueCount={stats.due_now} />}

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

      {/* `leeches?.length` (the exact array the Progress page's own leech
          section renders), not `stats.leech_count` -- FR-9.3 is
          specifically about the nudge's count and its "Fix →" destination
          coming from the *same* query, and this is the one that also
          backs the destination (see LeechNudge's own comment). Defaults
          to 0 while `leeches` is still loading, so the nudge simply
          doesn't render yet rather than flashing a stale/wrong count. */}
      <LeechNudge count={leeches?.length ?? 0} />
    </div>
  );
}
