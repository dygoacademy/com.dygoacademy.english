import * as React from 'react';

import { gcn } from './cn';
import { PlantGlyph } from './PlantGlyph';
import type { PlantStage } from './plantStage';

/**
 * Stage tile (design system §11): h 92, a plant glyph, the count in
 * `display-s` and the stage label. It filters a list by stage, so it's a
 * toggle button: on = forest with white text, exposed as `aria-pressed`.
 * The glyph is decorative; the label names the stage.
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
        'flex h-[92px] min-w-0 flex-col items-start justify-between rounded-control border p-3 text-left',
        'transition-colors duration-quick ease-garden disabled:opacity-50',
        selected
          ? 'border-garden-forest bg-garden-forest text-white'
          : 'border-garden-border bg-garden-surface text-garden-text hover:bg-garden-surface-sunken',
        className,
      )}
      {...props}
    >
      <PlantGlyph stage={stage} size={24} />
      <span className="w-full">
        <span className="tabular-nums-stat block font-display text-display-s">{count}</span>
        <span
          className={gcn(
            'block truncate text-label',
            selected ? 'text-white' : 'text-garden-muted',
          )}
        >
          {label}
        </span>
      </span>
    </button>
  ),
);
StageTile.displayName = 'GardenStageTile';
