import * as React from 'react';

import { gcn } from './cn';

/**
 * Filter chip (canvas A6). 38px tall (border included), 14px side
 * padding, pill, 14px semibold. Off = white + border; on = forest with
 * white text. It's a toggle button, so "on" is exposed as `aria-pressed`.
 * An invisible hit area makes the tap target 44px tall.
 */
export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  selected?: boolean;
  /** Optional leading icon or glyph (decorative). */
  icon?: React.ReactNode;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected = false, icon, type, children, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-pressed={selected}
      className={gcn(
        'relative inline-flex h-[38px] shrink-0 items-center gap-1 rounded-[19px] border px-[14px]',
        'text-[14px] font-semibold',
        "after:absolute after:inset-x-0 after:-inset-y-[3px] after:content-['']",
        'transition-colors duration-quick ease-garden disabled:opacity-50',
        selected
          ? 'border-garden-forest bg-garden-forest text-white'
          : 'border-garden-border bg-garden-surface text-garden-text hover:bg-garden-surface-sunken',
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  ),
);
Chip.displayName = 'GardenChip';
