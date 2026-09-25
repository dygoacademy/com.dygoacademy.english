import { gcn } from './cn';

/**
 * Progress vine (design system §11): a 10px track with a 22px leaf marker
 * riding the end of the fill. It is a real progressbar with a text
 * equivalent (§15: "15 of 18 words watered") passed as `valueText`.
 */
export function ProgressVine({
  value,
  max,
  valueText,
  className,
}: {
  value: number;
  max: number;
  /** Localised text equivalent, e.g. t('…', { done, total }). */
  valueText: string;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = (clamped / safeMax) * 100;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
      className={gcn('relative h-[22px] w-full', className)}
    >
      <div className="absolute inset-x-[11px] top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-garden-border">
        <div
          className="h-full rounded-full bg-garden-success transition-[width] duration-quick ease-garden"
          style={{ width: `${percent}%` }}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 22 22"
          className="absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 transition-[left] duration-quick ease-garden"
          style={{ left: `${percent}%` }}
        >
          <path
            d="M4 18C4 9 9 4 19 3c-1 10-6 15-15 15Z"
            fill="var(--stage-sprout-leaf)"
            stroke="var(--color-success)"
            strokeWidth="1.5"
          />
          <path
            d="M4 18 13 9"
            stroke="var(--color-success)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
