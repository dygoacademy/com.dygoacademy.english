import * as React from 'react';

import { gcn } from './cn';

/**
 * Keepsake (canvas A8): a 56px forest medal over its name (12px
 * semibold). The medal holds an icon or a number (Fraunces 18, gold).
 * `progress` (0–100) draws the next keepsake instead: a ring filling in
 * leaf green around the current count, with a muted name.
 */
export function Keepsake({
  label,
  icon,
  number,
  progress,
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  number?: string;
  progress?: { percent: number; value: string };
  className?: string;
}) {
  return (
    <div className={gcn('flex flex-col items-center gap-1 text-center', className)}>
      {progress ? (
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-[28px]"
          style={{
            background: `conic-gradient(var(--stage-tree-canopy) 0 ${progress.percent}%, var(--color-border) ${progress.percent}% 100%)`,
          }}
        >
          <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[23px] bg-bg text-[12px] font-bold text-muted-foreground">
            {progress.value}
          </span>
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-[28px] bg-forest font-display text-[18px] font-semibold text-gold-light"
        >
          {icon ?? number}
        </span>
      )}
      <span
        className={gcn('text-[12px] font-semibold leading-[1.2]', progress && 'text-muted-foreground')}
      >
        {label}
      </span>
    </div>
  );
}
