'use client';

import * as React from 'react';

import { gcn } from './cn';

/**
 * Switch (design system §11): 52 × 32 track, 26px knob, `role="switch"`
 * + `aria-checked`. On = success green, off = #CFC8B8. Label it with
 * `aria-label` or `aria-labelledby` (or wrap it in a <label>).
 */
export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'role'
> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, onClick, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange?.(!checked);
      }}
      className={gcn(
        'relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px]',
        'transition-colors duration-quick ease-garden disabled:opacity-50',
        checked ? 'bg-garden-success' : 'bg-garden-disabled',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={gcn(
          'h-[26px] w-[26px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
          'transition-transform duration-quick ease-garden',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  ),
);
Switch.displayName = 'GardenSwitch';
