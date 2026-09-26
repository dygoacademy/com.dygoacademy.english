import { gcn } from './cn';

/**
 * Weekly harvest (canvas A4): one plant per day on dark soil, grown by how
 * many of that day's missions were done: 0 = bare soil, 1 = sprout,
 * 2 = flower, 3 = fruit tree. Each column is the plant (in a 56px box,
 * bottom-aligned) over the day's name; today's name is gold and bold.
 */
export interface HarvestDay {
  /** e.g. "Mon" or "Today". */
  label: string;
  missions: 0 | 1 | 2 | 3;
  today?: boolean;
  /** e.g. "3 missions", read out for the plant. */
  plantLabel: string;
}

const SOIL = 'var(--stage-soil-dark)';
const LEAF = 'var(--stage-sprout-leaf)';

function DayPlant({ missions, label }: { missions: HarvestDay['missions']; label: string }) {
  switch (missions) {
    case 3:
      return (
        <svg width="44" height="56" viewBox="0 0 44 56" role="img" aria-label={label}>
          <ellipse cx="22" cy="52" rx="13" ry="3" fill={SOIL} />
          <rect x="20" y="30" width="4" height="22" fill="var(--stage-trunk)" />
          <circle cx="22" cy="20" r="15" fill="var(--stage-tree-canopy)" />
          <circle cx="11" cy="29" r="9" fill="var(--stage-tree-canopy)" />
          <circle cx="33" cy="29" r="9" fill="var(--stage-tree-canopy)" />
          <circle cx="16" cy="18" r="3" fill="var(--color-gold-light)" />
          <circle cx="28" cy="22" r="3" fill="var(--color-gold-light)" />
          <circle cx="22" cy="30" r="3" fill="var(--color-gold-light)" />
        </svg>
      );
    case 2:
      return (
        <svg width="40" height="52" viewBox="0 0 40 52" role="img" aria-label={label}>
          <ellipse cx="20" cy="48" rx="12" ry="3" fill={SOIL} />
          <path d="M20 47 V20" stroke={LEAF} strokeWidth="2.5" />
          <path d="M20 38 C14 37 11 33 13 29 C18 29 20 33 20 38 Z" fill={LEAF} />
          <circle cx="20" cy="10" r="5" fill="var(--stage-flower)" />
          <circle cx="26" cy="15" r="5" fill="var(--stage-flower)" />
          <circle cx="24" cy="22" r="5" fill="var(--stage-flower)" />
          <circle cx="16" cy="22" r="5" fill="var(--stage-flower)" />
          <circle cx="14" cy="15" r="5" fill="var(--stage-flower)" />
          <circle cx="20" cy="17" r="4" fill="var(--color-gold-light)" />
        </svg>
      );
    case 1:
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label={label}>
          <ellipse cx="20" cy="36" rx="12" ry="3" fill={SOIL} />
          <path d="M20 35 V22" stroke={LEAF} strokeWidth="2.5" />
          <path d="M20 28 C14 27 11 23 13 19 C18 19 20 23 20 28 Z" fill={LEAF} />
          <path d="M20 25 C26 24 29 20 27 16 C22 16 20 20 20 25 Z" fill="var(--stage-sprout)" />
        </svg>
      );
    default:
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label={label}>
          <ellipse cx="20" cy="36" rx="12" ry="3" fill={SOIL} />
        </svg>
      );
  }
}

export function WeekHarvest({
  days,
  className,
}: {
  days: readonly HarvestDay[];
  className?: string;
}) {
  return (
    <div className={gcn('grid grid-cols-7 items-end gap-0.5', className)}>
      {days.map((day, index) => (
        <div key={index} className="flex flex-col items-center gap-1">
          <div className="flex h-14 items-end">
            <DayPlant missions={day.missions} label={day.plantLabel} />
          </div>
          <span
            className={gcn(
              'whitespace-nowrap text-[12px]',
              day.today ? 'font-bold text-garden-gold-light' : 'font-medium text-stage-sprout',
            )}
          >
            {day.label}
          </span>
        </div>
      ))}
    </div>
  );
}
