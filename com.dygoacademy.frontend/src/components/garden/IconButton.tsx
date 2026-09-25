import * as React from 'react';

import { gcn } from './cn';

/**
 * Icon button (design system §11): 44 × 44 tap target, round, surface +
 * border, 20px icon. `aria-label` is required by the type, because an
 * icon-only control is invisible to VoiceOver without one (§15).
 */
export interface IconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  'aria-label': string;
  /** The icon, sized 20px by the button. Mark decorative SVGs aria-hidden. */
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type, children, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={gcn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
        'border border-garden-border bg-garden-surface text-garden-forest',
        'transition-[transform,background-color] duration-press ease-garden',
        'hover:bg-garden-surface-sunken active:scale-95 disabled:opacity-50',
        '[&_svg]:h-5 [&_svg]:w-5',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'GardenIconButton';
