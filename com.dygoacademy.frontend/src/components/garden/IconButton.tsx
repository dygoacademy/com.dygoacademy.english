import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { gcn } from './cn';

/**
 * Icon button (canvas: close, back, search, options). A 44 × 44 circle
 * with a 1px border, white, icon in the text colour. As in the canvas, a
 * link (`asChild`, e.g. Close / Back) sizes its content box, so it draws
 * 46 × 46; a <button> draws 44 × 44 (browsers size buttons border-box). `aria-label` is
 * required by the type, because an icon-only control is invisible to
 * VoiceOver without one. `asChild` renders the single child instead (e.g.
 * a Next <Link> for Close / Back), keeping the look.
 */
export interface IconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  'aria-label': string;
  /** The icon (20px in the canvas). Mark decorative SVGs aria-hidden. */
  children: React.ReactNode;
  asChild?: boolean;
}

export const iconButtonClasses =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' +
  'border border-border bg-surface text-text ' +
  'transition-[transform,background-color] duration-press ease-garden ' +
  'hover:bg-surface-sunken active:scale-95 disabled:opacity-50';

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type, children, asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot ref={ref} className={gcn(iconButtonClasses, 'box-content', className)} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={gcn(iconButtonClasses, className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
IconButton.displayName = 'GardenIconButton';
