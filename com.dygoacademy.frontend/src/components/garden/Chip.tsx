import * as React from 'react';

import { gcn } from './cn';

/**
 * Chip / filter (design system §11): h 38, pill, `label` 600, with a
 * transparent hit area that makes the tap target 44px tall (§8).
 * Off = surface + border; on = forest with white text. It's a toggle
 * button, so the on state is exposed as `aria-pressed`.
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
        'relative inline-flex h-[38px] shrink-0 items-center gap-1 rounded-full border px-4 text-label',
        // 38px visual height, 44px tap target (§8): an invisible hit area.
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
