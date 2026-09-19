'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGroupHeatmap } from '@/hooks/useGroupHeatmap';
import { useGroups } from '@/hooks/useGroups';
import { useLeeches } from '@/hooks/useLeeches';
import { useSrsStats } from '@/hooks/useSrsStats';
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
 */
export default function AnalyticsPage() {
  const { data: stats, isPending: statsPending, isError: statsError } = useSrsStats();
  const { data: leeches, isPending: leechesPending, isError: leechesError } = useLeeches();
  const { data: groups } = useGroups();

  const adminGroups = (groups ?? []).filter((g) => g.role === 'ADMIN');

  return (
    <main className={`mx-auto flex ${CONTENT_WIDTH.wide} flex-col gap-6 p-6`}>
      <h1 className="text-lg font-semibold">Analytics</h1>

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

      {/* id targeted by Home's LeechNudge "Fix →" link (Phase 2 FR-9.3) --
          both now read the exact same `useLeeches()` query, so the nudge
          can no longer point at a page that disagrees with its own count. */}
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
              className="flex items-center justify-between rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
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
