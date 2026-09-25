import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { CheckIcon } from './icons';

/**
 * Mission row (design system §11): a 40px icon circle, the title, a 6px
 * progress bar and the value on the right ("12/18").
 *
 * States: todo, in progress, done (title struck through, the icon becomes
 * a check). The bar is a real progressbar with a text equivalent, and the
 * state is also given in words for VoiceOver, so colour and strike-through
 * are never the only signal. Render it inside an <li>.
 */
export type MissionStatus = 'todo' | 'inProgress' | 'done';

export interface MissionRowProps {
  /** Decorative icon, e.g. <WaterIcon />. Replaced by a check when done. */
  icon: React.ReactNode;
  title: string;
  value: number;
  max: number;
  /** Visible value on the right, already formatted, e.g. "12/18". */
  valueLabel: string;
  /** Text equivalent of the bar, e.g. "12 of 18 words watered". */
  progressText: string;
  status: MissionStatus;
  className?: string;
}

const ICON_STYLE: Record<MissionStatus, string> = {
  todo: 'bg-garden-surface-sunken text-garden-muted',
  inProgress: 'bg-garden-water-soft text-garden-water-text',
  done: 'bg-garden-success text-white',
};

export function MissionRow({
  icon,
  title,
  value,
  max,
  valueLabel,
  progressText,
  status,
  className,
}: MissionRowProps) {
  const t = useTranslations('components.mission');
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = (clamped / safeMax) * 100;
  const done = status === 'done';

  return (
    <div
      data-status={status}
      className={gcn('flex min-h-[64px] items-center gap-3 py-2 text-garden-text', className)}
    >
      <span
        aria-hidden="true"
        className={gcn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full [&_svg]:h-5 [&_svg]:w-5',
          ICON_STYLE[status],
        )}
      >
        {done ? <CheckIcon /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={gcn(
            'text-body-m font-semibold',
            done && 'text-garden-muted line-through decoration-garden-muted',
          )}
        >
          {title}
          <span className="sr-only">, {t(`status.${status}`)}</span>
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={safeMax}
          aria-valuenow={clamped}
          aria-valuetext={progressText}
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-garden-border"
        >
          <div
            className={gcn(
              'h-full rounded-full transition-[width] duration-quick ease-garden',
              done ? 'bg-garden-success' : 'bg-garden-water',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <span
        aria-hidden="true"
        className={gcn(
          'tabular-nums-stat shrink-0 text-body-s font-semibold',
          done ? 'text-garden-success' : 'text-garden-muted',
        )}
      >
        {valueLabel}
      </span>
    </div>
  );
}
