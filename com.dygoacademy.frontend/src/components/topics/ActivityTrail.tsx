'use client';

import { useDailyActivity } from '@/hooks/useDailyActivity';
import type { DailyActivity } from '@/types';

const TRAIL_DAYS = 5;

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * `GET /srs/activity` omits days with zero reviews entirely (see the
 * backend's own comment on that route) -- filled back in here as
 * zero-count days rather than left as gaps, so a missed day still gets
 * its own node instead of silently disappearing from the trail.
 */
function buildTrail(
  data: DailyActivity[] | undefined,
  days: number,
): { date: string; reviewCount: number; isToday: boolean }[] {
  const byDate = new Map((data ?? []).map((d) => [d.review_date, d.review_count]));
  const today = utcDateString(new Date());
  const trail: { date: string; reviewCount: number; isToday: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = utcDateString(d);
    trail.push({ date: dateStr, reviewCount: byDate.get(dateStr) ?? 0, isToday: dateStr === today });
  }
  return trail;
}

/**
 * Home's activity trail (Phase 3 Module 18, FR-18.1) -- the last 5 days as
 * a visual sequence, next to (not instead of) the existing aggregate
 * `DueNowCard`: this answers "how have I been doing," `DueNowCard` still
 * answers "what do I do right now." Visual reference is the "Dygo Learning
 * Path" concept artifact's node styling, not its literal markup -- that
 * was illustrative HTML for a mockup, not production code to copy.
 *
 * Dates computed in UTC to match `GET /srs/activity`'s own
 * `(reviewed_at at time zone 'utc')::date::text` grouping -- using
 * local-timezone day boundaries here would misalign a node against the
 * backend's own definition of "today" for any caller not in UTC.
 */
export function ActivityTrail() {
  const { data, isPending, isError } = useDailyActivity(TRAIL_DAYS);

  if (isPending) {
    return <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">Couldn&apos;t load your activity right now.</p>
    );
  }

  const trail = buildTrail(data, TRAIL_DAYS);

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border p-3">
      {trail.map((day) => {
        const label = new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, {
          weekday: 'short',
          timeZone: 'UTC',
        });
        const done = day.reviewCount > 0;
        return (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? 'bg-primary text-primary-foreground'
                  : day.isToday
                    ? 'border-2 border-dashed border-primary text-primary'
                    : 'border text-muted-foreground'
              }`}
              aria-label={
                done
                  ? `${label}: ${day.reviewCount} review${day.reviewCount === 1 ? '' : 's'}`
                  : day.isToday
                    ? `${label}: not studied yet`
                    : `${label}: no reviews`
              }
            >
              {done ? day.reviewCount : day.isToday ? '•' : ''}
            </div>
            <span className="text-[10px] uppercase text-muted-foreground">
              {day.isToday ? 'Today' : label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
