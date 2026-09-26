import { gcn } from './cn';
import { SproutIcon } from './icons';

/**
 * Streak pill (canvas A1): white pill with a border, the green sprout,
 * the day count (15px bold) and its unit (12px muted). `label` is the
 * full sentence for VoiceOver ("23-day streak").
 */
export function StreakPill({
  count,
  unit,
  label,
  className,
}: {
  /** Already formatted, e.g. "23". */
  count: string;
  /** e.g. "days". */
  unit: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={gcn(
        'flex items-center gap-1.5 rounded-[20px] border border-garden-border bg-garden-surface py-[7px] pl-[9px] pr-3',
        className,
      )}
    >
      <SproutIcon width={20} height={20} stroke="var(--color-success)" />
      <span aria-hidden="true" className="text-[15px] font-bold">
        {count}
      </span>
      <span aria-hidden="true" className="text-[12px] text-garden-muted">
        {unit}
      </span>
    </div>
  );
}
