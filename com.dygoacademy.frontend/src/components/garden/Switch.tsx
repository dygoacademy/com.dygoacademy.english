'use client';

import * as React from 'react';

import { gcn } from './cn';

/**
 * Switch (canvas): `role="switch"` + `aria-checked`. On = success green,
 * off = #CFC8B8, white knob 3px from the edge. `size="md"` is 52 × 32
 * with a 26px knob (Mission complete); `size="sm"` is 48 × 30 with a 24px
 * knob (Me). Label it with `aria-label` or `aria-labelledby`. An
 * invisible hit area makes the tap target 44px tall.
 */
export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'role'
> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: 'md' | 'sm';
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, size = 'md', className, disabled, onClick, ...props }, ref) => (
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
        'relative shrink-0 cursor-pointer rounded-full p-0',
        size === 'md' ? 'h-8 w-[52px]' : 'h-[30px] w-12',
        "after:absolute after:inset-x-0 after:-inset-y-[7px] after:content-['']",
        'transition-colors duration-quick ease-garden disabled:opacity-50',
        checked ? 'bg-garden-success' : 'bg-garden-disabled',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={gcn(
          'absolute top-[3px] rounded-full bg-white transition-[left] duration-200',
          size === 'md' ? 'h-[26px] w-[26px]' : 'h-6 w-6',
          checked ? (size === 'md' ? 'left-[23px]' : 'left-[21px]') : 'left-[3px]',
        )}
      />
    </button>
  ),
);
Switch.displayName = 'GardenSwitch';
