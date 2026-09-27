'use client';

import { LearningPath } from '@/components/topics/LearningPath';
import { LeechNudge } from '@/components/topics/LeechNudge';
import { TierProgressCard } from '@/components/topics/TierProgressCard';
import { TopicCard } from '@/components/topics/TopicCard';
import { useLeeches } from '@/hooks/useLeeches';
import { useSrsStats } from '@/hooks/useSrsStats';
import { useTierProgress } from '@/hooks/useTierProgress';
import { useTopics } from '@/hooks/useTopics';
import { CONTENT_WIDTH } from '@/constants/layout';
import { formatGreeting } from '@/lib/utils';

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
 *
 * `ActivityTrail` (past, added Phase 3 Module 18), `DueNowCard` (today),
 * and `UpcomingPath` (future, added Phase 9) were three separate boxes
 * here through most of Phase 9 -- each answering its own question ("how
 * have I been doing," "what do I do right now," "what's coming"), each
 * reading its own hook. Merged into one `LearningPath` 2026-09-20, live-
 * requested ("follow the UI/UX design with same with mock design with
 * light mode not dark mode"): the mockup's own Home screen was never
 * three stacked boxes, it was one connected vertical sequence of day-rows
 * with a single CTA at the bottom -- matching that structurally (while
 * keeping this app's existing light color tokens, not the mockup's dark
 * navy palette) meant combining what `ActivityTrail`/`DueNowCard`/
 * `UpcomingPath` each did into the one component, not three. All three
 * were deleted outright rather than left unused -- confirmed via grep
 * that nothing else in the app referenced them, unlike `TopicGridCard`
 * (Topics as Collections), which stayed because that one *is* a real,
 * user-facing toggle between two views, not a straight replacement.
 *
 * `TierProgressCard` added above `LearningPath` 2026-09-20 (Phase 9,
 * "Vocabulary Mastery Tier Ladder" — `phase 9 implementation plan.md`) —
 * replaces the mockup's invented "Band trend: 6.4" hero metric with a
 * checkable one. Shared with `analytics/page.tsx`, both reading the same
 * `useTierProgress()` hook so they can't disagree, same reasoning as the
 * `useSrsStats()`/`useLeeches()` reuse two paragraphs up.
 *
 * Greeting became "Good evening, Sarah" (`formatGreeting`) 2026-09-21,
 * matching the mockup's own "GOOD EVENING, SARAH" -- another Phase 9
 * detail this page had missed. Stays the static "Welcome back" while
 * `stats` is still loading, same "don't guess ahead of real data" rule
 * the streak callout below already followed -- `stats.display_name` is
 * the one new field this needed, folded into the existing `useSrsStats()`
 * call rather than a second request.
 */
export default function TopicsHomePage() {
  const { data: topics, isPending, isError } = useTopics();
  const { data: stats, isPending: statsPending, isError: statsError } = useSrsStats();
  const { data: leeches } = useLeeches();
  const { data: tierProgress } = useTierProgress();

  return (
    <div className={`mx-auto flex ${CONTENT_WIDTH.default} flex-col gap-4 p-6`}>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {stats ? formatGreeting(stats.display_name) : 'Welcome back'}
        </h1>
        {stats && (
          <span className="rounded-full border px-2.5 py-1 text-xs">
            {stats.current_streak_days}-day streak
          </span>
        )}
      </div>

      {tierProgress && <TierProgressCard progress={tierProgress} />}

      {statsPending && <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />}
      {statsError && (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your due count right now. Check that the API is running.
        </p>
      )}
      {stats && <LearningPath dueCount={stats.due_now} />}

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
