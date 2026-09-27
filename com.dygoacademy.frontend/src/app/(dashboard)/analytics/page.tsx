'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TierProgressCard } from '@/components/topics/TierProgressCard';
import { useGroupHeatmap } from '@/hooks/useGroupHeatmap';
import { useGroups } from '@/hooks/useGroups';
import { useLeeches } from '@/hooks/useLeeches';
import { useSrsStats } from '@/hooks/useSrsStats';
import { useTierProgress } from '@/hooks/useTierProgress';
import type { GroupSummary, SrsStats } from '@/types';
import { CONTENT_WIDTH } from '@/constants/layout';

/**
 * Module 8 (Phase 4). Was the literal "Coming in a later phase" stub since
 * Phase 0 — real now, in two halves:
 *
 * FR-8.1 (per-student stats + leech list) was already served by the
 * backend since Phase 2 (`GET /srs/stats`, `GET /srs/leeches`); nothing on
 * the frontend called either route until this pass (`useSrsStats`,
 * `useLeeches`, both new).
 *
 * FR-8.2 (the class-wide mistake heatmap) is new end-to-end this pass —
 * `GroupHeatmapSection` below, one per group the signed-in caller is
 * ADMIN of, backed by `GET /groups/:id/heatmap` (`useGroupHeatmap`). Not
 * every user administers a group, so that section only renders when
 * `adminGroups` is non-empty — a student-only account sees just their own
 * stats and leech list, which is the entire FR-8.1 half of this page.
 *
 * `TierProgressCard` added above "Your progress" 2026-09-20 (Phase 9,
 * "Vocabulary Mastery Tier Ladder" — `phase 9 implementation plan.md`) --
 * replaces the mockup's invented "Estimated band: On track for 7.0" gauge
 * with a checkable one. Shared with `(dashboard)/page.tsx` (Home), both
 * reading the same `useTierProgress()` hook so they can't disagree.
 */
export default function AnalyticsPage() {
  const { data: stats, isPending: statsPending, isError: statsError } = useSrsStats();
  const { data: leeches, isPending: leechesPending, isError: leechesError } = useLeeches();
  const { data: groups } = useGroups();
  const { data: tierProgress } = useTierProgress();

  const adminGroups = (groups ?? []).filter((g) => g.role === 'ADMIN');

  return (
    <main className={`mx-auto flex ${CONTENT_WIDTH.wide} flex-col gap-6 p-6`}>
      <h1 className="text-lg font-semibold">Analytics</h1>

      {tierProgress && <TierProgressCard progress={tierProgress} />}

      <section className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Your progress
        </p>
        {statsPending && <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />}
        {statsError && (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load your stats right now.</p>
        )}
        {stats && <StatsGrid stats={stats} />}
      </section>

      {/* Phase 9, "Ranked Focus List" (`phase 9 implementation plan.md`) --
          a ranked top-3 summary, worst-first (the same order `useLeeches()`
          already returns -- `srs.service.ts`'s query is already
          `order by recent_mistakes desc, next_due_at asc`, no client sort
          needed), each with a mistake-scaled bar instead of a text count.
          Deliberately additive, not a cap on the section below: capping
          the existing "Leech words" list to 3 (the original plan) was
          reconsidered after the Topics-as-Collections feature shipped as a
          hard replacement the same day and got live feedback preferring a
          choice over having one made for the viewer -- this section adds
          a prioritized view on top rather than hiding anything the
          existing list already showed. Bar width reuses `leechPillClass`'s
          existing 3-step bucket thresholds (`leechBarWidth`, same
          boundaries) rather than a new continuous scale, so the two visual
          treatments (this bar, that pill) stay consistent with each
          other. */}
      {leeches && leeches.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Focus words ({Math.min(3, leeches.length)})
          </p>
          <div className="flex flex-col gap-1.5">
            {leeches.slice(0, 3).map((leech) => (
              <div key={leech.topic_word_id} className="rounded-xl border px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span>{leech.source_word}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {leech.recent_mistakes} recent {leech.recent_mistakes === 1 ? 'miss' : 'misses'}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-destructive"
                    style={{ width: `${leechBarWidth(leech.recent_mistakes)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* id targeted by Home's LeechNudge "Fix →" link (Phase 2 FR-9.3) --
          both now read the exact same `useLeeches()` query, so the nudge
          can no longer point at a page that disagrees with its own count.
          Row coloring scaled by `recent_mistakes` 2026-09-20 (Phase 3
          Module 22, FR-22.1) -- this personal list already existed since
          Module 8's original build (predates both Phase 2 and Phase 3),
          but every row shared the same fixed `border-destructive/40
          bg-destructive/10`, the exact "one color for every rate" problem
          FR-14.1 fixed for the *group* heatmap without ever touching this
          personal one. `phase 3.md`'s original framing of Module 22 as "no
          personal focus view exists yet" was wrong -- this section already
          was one; the actual gap was only its flat coloring, corrected here
          rather than adding a second, redundant list next to it.

          Kept showing the full, uncapped list here (not just the top 3
          above) -- Phase 9's "Focus words" section is a ranked summary
          layered on top, not a replacement for this one, same reasoning
          as its own comment above. */}
      <section id="leech-words" className="flex flex-col gap-2 scroll-mt-20">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Leech words
        </p>
        {leechesPending && <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />}
        {leechesError && (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load your leech list right now.</p>
        )}
        {leeches?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No leech words right now — nothing has failed 4+ times in the last 7 days.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          {leeches?.map((leech) => (
            <div
              key={leech.topic_word_id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${leechPillClass(leech.recent_mistakes)}`}
            >
              <span>{leech.source_word}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {leech.recent_mistakes} recent {leech.recent_mistakes === 1 ? 'miss' : 'misses'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {adminGroups.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Class mistake heatmap
          </p>
          {adminGroups.map((group) => (
            <GroupHeatmapSection key={group.id} group={group} />
          ))}
        </section>
      )}
    </main>
  );
}

function StatsGrid({ stats }: { stats: SrsStats }) {
  const items: { label: string; value: string | number }[] = [
    { label: 'Streak', value: `${stats.current_streak_days}d` },
    { label: 'Mastered', value: stats.mastered_words },
    { label: 'Due now', value: stats.due_now },
    { label: 'Leeches', value: stats.leech_count },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex flex-col items-center gap-1 p-3">
            <span className="text-lg font-semibold">{item.value}</span>
            <span className="text-center text-[10px] uppercase tracking-wide text-muted-foreground">
              {item.label}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Three fixed intensity steps over the existing `destructive` token,
 * rather than a continuous gradient (Phase 2 implementation plan's own
 * "a stepped scale is enough" call) or a brand-new hue -- `failure_rate`
 * is already 0..1 (`heatmap-aggregator.ts`'s `rankHeatmap`), so a plain
 * threshold split is all a bucket needs.
 */
function heatmapPillClass(rate: number): string {
  if (rate >= 2 / 3) return 'border-destructive bg-destructive/25 text-destructive';
  if (rate >= 1 / 3) return 'border-destructive/50 bg-destructive/10 text-destructive';
  return 'border-destructive/25 bg-destructive/5 text-destructive/70';
}

/**
 * Same three-step idea as `heatmapPillClass`, but keyed on an absolute
 * `recent_mistakes` count rather than a 0..1 rate -- `LeechCard` has no
 * `failure_rate` field, and every row here already cleared
 * `fsrs-scheduler.ts`'s `LEECH_THRESHOLD` (4) by definition (that's what
 * makes it a leech), so the floor for "low" starts there rather than at 0.
 * Thresholds picked relative to that real value, not a guessed number
 * (Phase 3 Module 22, FR-22.1).
 */
function leechPillClass(recentMistakes: number): string {
  if (recentMistakes >= 8) return 'border-destructive bg-destructive/25 text-destructive';
  if (recentMistakes >= 6) return 'border-destructive/50 bg-destructive/10 text-destructive';
  return 'border-destructive/25 bg-destructive/5 text-destructive/70';
}

/**
 * Phase 9, "Ranked Focus List" -- same 3-step bucket boundaries as
 * `leechPillClass` immediately above, translated to a fill percentage
 * instead of a pill-tint class, so the "Focus words" bar and this
 * section's own pill coloring read as one consistent severity scale
 * rather than two different ones for the same underlying number.
 */
function leechBarWidth(recentMistakes: number): number {
  if (recentMistakes >= 8) return 100;
  if (recentMistakes >= 6) return 66;
  return 33;
}

/**
 * One card per group the caller administers. `useGroupHeatmap` is called
 * unconditionally inside this per-group component (not in a loop inside
 * `AnalyticsPage` itself) so the number of hook calls per render stays
 * fixed regardless of how many groups the caller admins — the standard
 * "extract a subcomponent" fix for the rules-of-hooks issue a `.map()`
 * over a variable-length list plus a hook call would otherwise create.
 *
 * Filtered to `failure_rate > 0` and recolored by that rate 2026-09-19
 * (Phase 2 FR-14.1 -- audit finding: every word in the group rendered here,
 * including ones never missed, all in the identical pale-red pill as words
 * missed a third of the time -- a "heatmap" that colors 0% and 33% the
 * same isn't encoding severity, and burying real problem words under
 * perfect ones defeats the point of a mistake list). The backend's own
 * `rankHeatmap` already sorts worst-first and caps at
 * `DEFAULT_HEATMAP_LIMIT` -- this filter only removes the zero-mistake
 * tail from that same list, no new query or endpoint needed.
 */
function GroupHeatmapSection({ group }: { group: GroupSummary }) {
  const { data: heatmap, isPending, isError } = useGroupHeatmap(group.id);
  const mistakes = heatmap?.filter((entry) => entry.failure_rate > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{group.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {isPending && <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load the heatmap for this group.
          </p>
        )}
        {heatmap?.length === 0 && (
          <p className="text-sm text-muted-foreground">No review activity in this group yet.</p>
        )}
        {heatmap && heatmap.length > 0 && mistakes?.length === 0 && (
          <p className="text-sm text-muted-foreground">No mistakes to review — nice work.</p>
        )}
        {mistakes?.map((entry) => (
          <div
            key={entry.topic_word_id}
            className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
          >
            <div className="flex flex-col">
              <span>{entry.source_word}</span>
              <span className="text-xs text-muted-foreground">{entry.topic_title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {entry.failures}/{entry.attempts}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] ${heatmapPillClass(entry.failure_rate)}`}
              >
                {Math.round(entry.failure_rate * 100)}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
