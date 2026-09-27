'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/constants/routes';
import { useDailyActivity } from '@/hooks/useDailyActivity';
import { useUpcomingActivity } from '@/hooks/useUpcomingActivity';
import { addDays, getResolvedTimezone, toLocalDateString, weekdayLabel } from '@/lib/timezone';
import type { DailyActivity, UpcomingActivity } from '@/types';

const PAST_DAYS = 2;
const FUTURE_DAYS = 2;

type PastNode = { kind: 'past'; date: string; reviewCount: number };
type FutureNode = { kind: 'future'; date: string; dueCount: number; isNext: boolean };
type PathNode = PastNode | { kind: 'today' } | FutureNode;

/**
 * Builds the 5-row window around "today" in the *caller's* local calendar
 * (via lib/timezone.ts), not UTC — was `d.setUTCDate(...)` off a raw
 * `new Date()`, which put an early-morning UTC+N user's "today" a day
 * behind (Sept 2026: a Singapore user at 7am local saw Sunday's row
 * labeled "Today" because it was still Sunday in UTC). `useDailyActivity`/
 * `useUpcomingActivity` send the same resolved timezone to the backend so
 * its day-grouping agrees with this component's row dates.
 */
function buildPath(past: DailyActivity[] | undefined, upcoming: UpcomingActivity[] | undefined): PathNode[] {
  const byPastDate = new Map((past ?? []).map((d) => [d.review_date, d.review_count]));
  const byFutureDate = new Map((upcoming ?? []).map((d) => [d.due_date, d.due_count]));
  const nodes: PathNode[] = [];

  const todayStr = toLocalDateString(new Date());

  for (let i = PAST_DAYS; i >= 1; i--) {
    const dateStr = addDays(todayStr, -i);
    nodes.push({ kind: 'past', date: dateStr, reviewCount: byPastDate.get(dateStr) ?? 0 });
  }

  nodes.push({ kind: 'today' });

  for (let i = 1; i <= FUTURE_DAYS; i++) {
    const dateStr = addDays(todayStr, i);
    nodes.push({
      kind: 'future',
      date: dateStr,
      dueCount: byFutureDate.get(dateStr) ?? 0,
      isNext: i === 1,
    });
  }

  return nodes;
}

/**
 * Home's centerpiece (Phase 9 visual pass, 2026-09-20 — "follow the
 * UI/UX design with same with mock design with light mode not dark
 * mode") — replaces three separate boxes (`DueNowCard`, `ActivityTrail`,
 * `UpcomingPath`) with one connected vertical sequence of day-rows,
 * matching the mockup's actual layout (a vertical list of day-label +
 * status-text rows, each with its own icon on the right — not a
 * horizontal strip of small circles, which is what the previous three
 * components used and what an earlier, mistaken memory of the mockup
 * assumed). Light-mode colors throughout — same `--primary`/`--muted`
 * tokens every other card in this app already uses, not the mockup's
 * dark navy palette.
 *
 * Still wireframe 1d's "one decision on open" (see `DueNowCard`'s
 * now-retired comment) — the Today row is the only clickable one, and
 * the CTA below the whole path is the one action this screen actually
 * wants a visitor to take.
 *
 * `PAST_DAYS`/`FUTURE_DAYS` both trimmed to 2 (from the previous
 * components' 4-past/3-future defaults) to keep the row count close to
 * the mockup's own 5 total rows (2 past + today + 2 future) now that
 * they're a vertical list, not a horizontal strip where more nodes cost
 * little extra space.
 */
export function LearningPath({ dueCount }: { dueCount: number }) {
  const timezone = getResolvedTimezone();
  const { data: past, isPending: pastPending, isError: pastError } = useDailyActivity(PAST_DAYS, timezone);
  const {
    data: upcoming,
    isPending: upcomingPending,
    isError: upcomingError,
  } = useUpcomingActivity(FUTURE_DAYS, timezone);

  if (pastPending || upcomingPending) {
    return <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />;
  }

  if (pastError || upcomingError) {
    return (
      <p className="text-sm text-muted-foreground">Couldn&apos;t load your path right now.</p>
    );
  }

  const path = buildPath(past, upcoming);

  return (
    <Card className="border-2 border-primary">
      <CardContent className="flex flex-col gap-1 p-4">
        {path.map((node) => {
          if (node.kind === 'today') {
            return (
              <Link
                key="today"
                href={ROUTES.study}
                className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/40"
              >
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Today
                  </span>
                  <span className="text-sm font-medium">
                    {dueCount > 0 ? `${dueCount} word${dueCount === 1 ? '' : 's'}` : 'All done for now'}
                  </span>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-hidden="true"
                >
                  <PlayIcon />
                </span>
              </Link>
            );
          }

          if (node.kind === 'past') {
            const done = node.reviewCount > 0;
            return (
              <div key={node.date} className="flex items-center justify-between gap-3 px-2 py-2.5">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {weekdayLabel(node.date)}
                  </span>
                  <span className="text-sm font-medium">{done ? 'Cleared' : 'Missed'}</span>
                </div>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? 'bg-primary/15 text-primary'
                      : 'border text-muted-foreground'
                  }`}
                  aria-hidden="true"
                >
                  {done && <CheckIcon />}
                </span>
              </div>
            );
          }

          const label = node.isNext ? 'Up next' : 'Locked';
          return (
            <div key={node.date} className="flex items-center justify-between gap-3 px-2 py-2.5">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {weekdayLabel(node.date)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
              </div>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  node.isNext
                    ? 'border-2 border-dashed border-primary text-primary'
                    : 'border text-muted-foreground'
                }`}
              >
                {node.dueCount}
              </span>
            </div>
          );
        })}

        <Button asChild size="lg" className="mt-2">
          <Link href={ROUTES.study}>
            {dueCount > 0 ? "Continue today's path" : 'Start review'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
