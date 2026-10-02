import { gcn } from './cn';

/**
 * Garden calendar (canvas A8): 16 week columns of 7 days, 13px squares 3px
 * apart, radius 3, shaded by how many missions were done that day (0–3).
 * Days still to come are an empty outline. Under it, the legend ("Each
 * square = one day's missions", 0 ■■■■ 3).
 *
 * `weeks[w][d]` is a level 0–3, or null for a day in the future.
 * `label` describes the whole grid for VoiceOver (e.g. "Missions per day
 * for the last 16 weeks"); the squares themselves are decorative.
 */
export type CalendarLevel = 0 | 1 | 2 | 3;

const LEVEL = [
  'bg-track border-track',
  'bg-calendar-1 border-calendar-1',
  'bg-stage-tree-canopy border-stage-tree-canopy',
  'bg-forest border-forest',
] as const;

const SWATCH = [
  'bg-track',
  'bg-calendar-1',
  'bg-stage-tree-canopy',
  'bg-forest',
];

export function GardenCalendar({
  weeks,
  label,
  legend,
  low,
  high,
  className,
}: {
  weeks: ReadonlyArray<ReadonlyArray<CalendarLevel | null>>;
  label: string;
  legend: string;
  /** Legend ends, e.g. "0" and "3". */
  low: string;
  high: string;
  className?: string;
}) {
  return (
    <>
      <div
        role="img"
        aria-label={label}
        className={gcn('grid gap-[3px]', className)}
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((days, w) => (
          <div key={w} className="grid grid-rows-[repeat(7,13px)] gap-[3px]">
            {days.map((level, d) => (
              <span
                key={d}
                className={gcn(
                  'rounded-[3px] border',
                  level === null ? 'border-border bg-transparent' : LEVEL[level],
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex items-center gap-1 text-[12px] text-muted-foreground">
        <span className="flex-grow">{legend}</span>
        <span>{low}</span>
        {SWATCH.map((swatch) => (
          <span key={swatch} className={gcn('h-3 w-3 rounded-[3px]', swatch)} />
        ))}
        <span>{high}</span>
      </div>
    </>
  );
}
