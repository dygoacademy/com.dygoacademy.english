import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { CheckIcon } from './icons';

/**
 * Mission row (canvas A1): a 40px icon circle, then the title (15px bold)
 * and the value on the right (13px), over a 6px progress bar.
 *
 * - `tone` colours the icon well: water (blue wash), gold (the
 *   challenge), plant (sprout wash).
 * - done: the well turns forest with a white check, the title is muted
 *   and struck through, the value is green, and the whole bar is green.
 *
 * The bar is a real progressbar with a text equivalent, and the state is
 * also given in words for VoiceOver, so colour and strike-through are
 * never the only signal. Render it inside an <li>.
 */
export type MissionStatus = 'todo' | 'inProgress' | 'done';
export type MissionTone = 'water' | 'gold' | 'plant';

export interface MissionRowProps {
  /** Decorative 20px icon, e.g. <WaterIcon />. Replaced by a check when done. */
  icon: React.ReactNode;
  title: string;
  value: number;
  max: number;
  /** Visible value on the right, already formatted, e.g. "15/18", "Done", "3 min". */
  valueLabel: string;
  /** Text equivalent of the bar, e.g. "15 of 18 words watered". */
  progressText: string;
  status: MissionStatus;
  tone?: MissionTone;
  className?: string;
}

const WELL: Record<MissionTone, string> = {
  water: 'bg-garden-water-soft',
  gold: 'bg-garden-gold-wash',
  plant: 'bg-rating-good',
};

export function MissionRow({
  icon,
  title,
  value,
  max,
  valueLabel,
  progressText,
  status,
  tone = 'water',
  className,
}: MissionRowProps) {
  const t = useTranslations('components.mission');
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);
  const done = status === 'done';

  return (
    <div data-status={status} className={gcn('flex items-center gap-3', className)}>
      <span
        aria-hidden="true"
        className={gcn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          done ? 'bg-garden-forest text-white' : WELL[tone],
        )}
      >
        {done ? <CheckIcon width={20} height={20} stroke="var(--color-surface)" /> : icon}
      </span>
      <div className="flex flex-grow flex-col gap-[5px]">
        <div className="flex justify-between">
          <span className={gcn('text-[15px] font-bold', done && 'text-garden-muted line-through')}>
            {title}
            <span className="sr-only">, {t(`status.${status}`)}</span>
          </span>
          <span
            aria-hidden="true"
            className={gcn(
              'text-[13px]',
              done ? 'font-semibold text-garden-success' : 'text-garden-muted',
            )}
          >
            {valueLabel}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={safeMax}
          aria-valuenow={clamped}
          aria-valuetext={progressText}
          className={gcn('h-1.5 rounded-[3px]', done ? 'bg-garden-success' : 'bg-garden-track')}
        >
          {!done && percent > 0 ? (
            <div
              className="h-1.5 rounded-[3px] bg-garden-water transition-[width] duration-quick ease-garden"
              style={{ width: `${percent}%` }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
