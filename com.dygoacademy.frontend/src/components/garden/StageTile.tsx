import * as React from 'react';

import { gcn } from './cn';
import { PlantGlyph } from './PlantGlyph';
import type { PlantStage } from './plantStage';

/**
 * Stage tile (canvas A7): 92px tall (2px border included), radius 18, the plant on
 * its soil, the count (Fraunces 18) and the label (12px semibold), all
 * bottom-aligned. It filters a list by stage, so it's a toggle button:
 * on = forest with white text, exposed as `aria-pressed`. The glyph is
 * decorative; the label names the stage.
 */
export interface StageTileProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  stage: PlantStage;
  /** Already formatted for the locale (Intl.NumberFormat). */
  count: string;
  label: string;
  selected?: boolean;
}

export const StageTile = React.forwardRef<HTMLButtonElement, StageTileProps>(
  ({ stage, count, label, selected = false, className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-pressed={selected}
      data-stage={stage}
      className={gcn(
        'flex h-[92px] min-w-0 cursor-pointer flex-col items-center justify-end gap-0.5 rounded-[18px] border-2 pb-2',
        'transition-colors duration-quick ease-garden disabled:opacity-50',
        selected
          ? 'border-forest bg-forest text-white'
          : 'border-border bg-surface text-text',
        className,
      )}
      {...props}
    >
      <PlantGlyph stage={stage} variant="tile" />
      <span className="font-display text-[18px] font-semibold leading-none">{count}</span>
      <span className="text-[12px] font-semibold">{label}</span>
    </button>
  ),
);
StageTile.displayName = 'GardenStageTile';
