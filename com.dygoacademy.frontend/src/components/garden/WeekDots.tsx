import { gcn } from './cn';
import { CheckIcon } from './icons';

/**
 * Week dots (canvas A3): the seven days of this week in a white card, each
 * a 30px circle (2px border) over its initial. Done = green with a check,
 * today (done) = terracotta with a check, not yet = white outline.
 * `label` is the day's full description for VoiceOver.
 */
export interface WeekDay {
  /** One-letter label, e.g. "M". */
  initial: string;
  label: string;
  state: 'done' | 'today' | 'empty';
}

export function WeekDots({ days, className }: { days: readonly WeekDay[]; className?: string }) {
  return (
    <ul
      className={gcn(
        'flex justify-between rounded-[18px] border border-border bg-surface px-[14px] py-3',
        className,
      )}
    >
      {days.map((day, index) => (
        <li key={index} className="flex flex-col items-center gap-1" aria-label={day.label}>
          <span
            aria-hidden="true"
            className={gcn(
              'flex h-[30px] w-[30px] items-center justify-center rounded-[15px] border-2',
              day.state === 'done' && 'border-success bg-success',
              day.state === 'today' && 'border-primary bg-primary',
              day.state === 'empty' && 'border-border bg-surface',
            )}
          >
            {day.state !== 'empty' ? (
              <CheckIcon width={14} height={14} stroke="var(--color-surface)" strokeWidth="3.5" />
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className={gcn(
              'text-[12px] font-semibold',
              day.state === 'today' ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {day.initial}
          </span>
        </li>
      ))}
    </ul>
  );
}
