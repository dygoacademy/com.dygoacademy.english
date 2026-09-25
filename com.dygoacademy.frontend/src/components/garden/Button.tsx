'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { gcn } from './cn';
import { Spinner } from './Spinner';

/**
 * Garden buttons (design system §11: primary, secondary, forest).
 *
 * - primary: h 56, terracotta, pressable shadow. The only primary action
 *   on a screen.
 * - secondary: h 52, surface + border, forest text.
 * - forest: h 60, forest bg, forest pressable shadow ("Show answer").
 *
 * A client component: its click handler swallows presses while loading,
 * and server pages (the gallery, UI-4 screens) render it directly.
 *
 * Full width on iPhone, capped at 400px from `medium` up. Labels wrap
 * rather than truncate (§14.5: Vietnamese runs ~40% longer). Pressing
 * moves the button down 2px and halves the shadow over 80ms (§7.2).
 */
const buttonVariants = cva(
  [
    'relative inline-flex w-full select-none flex-col items-center justify-center gap-0.5',
    'rounded-control px-5 py-2 text-center text-body-l font-bold',
    'transition-[transform,box-shadow,background-color] duration-press ease-garden',
    'medium:max-w-[400px]',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: [
          'min-h-14 bg-garden-primary text-white shadow-press-primary',
          'active:translate-y-[2px] active:shadow-press-primary-down',
          'disabled:translate-y-0 disabled:bg-garden-disabled disabled:text-garden-text disabled:shadow-none',
        ],
        secondary: [
          'min-h-[52px] border border-garden-border bg-garden-surface text-garden-forest',
          'hover:bg-garden-surface-sunken active:bg-garden-surface-sunken',
          'disabled:border-garden-disabled disabled:text-garden-muted',
        ],
        forest: [
          'min-h-[60px] bg-garden-forest text-white shadow-press-forest',
          'active:translate-y-[2px] active:shadow-press-forest-down',
          'disabled:translate-y-0 disabled:bg-garden-disabled disabled:text-garden-text disabled:shadow-none',
        ],
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

export interface GardenButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Optional second line in `body-s` under the label. */
  secondLine?: React.ReactNode;
  /** Shows a spinner, keeps the label, and blocks presses. */
  loading?: boolean;
  /** Render as the single child element (e.g. a Next `<Link>`); ignores loading/secondLine. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, GardenButtonProps>(
  (
    {
      className,
      variant,
      secondLine,
      loading = false,
      asChild = false,
      disabled,
      children,
      type,
      onClick,
      ...props
    },
    ref,
  ) => {
    const classes = gcn(buttonVariants({ variant }), className);

    // asChild (e.g. a Next <Link> styled as a button): the child keeps its
    // own content, so there is no spinner or second line in this mode.
    if (asChild) {
      return (
        <Slot ref={ref} className={classes} onClick={onClick} {...props}>
          {children}
        </Slot>
      );
    }

    // Loading keeps the button's colours (the spec's loading state is
    // "spinner, label kept"), so it's aria-disabled rather than natively
    // disabled, and presses are swallowed here instead.
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={gcn(classes, loading && 'pointer-events-none')}
        disabled={disabled}
        aria-disabled={loading || undefined}
        aria-busy={loading || undefined}
        {...props}
        onClick={(event) => {
          if (loading) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      >
        <span className="inline-flex items-center gap-2">
          {loading ? <Spinner /> : null}
          <span>{children}</span>
        </span>
        {secondLine ? (
          <span className="text-body-s font-normal opacity-90">{secondLine}</span>
        ) : null}
      </button>
    );
  },
);
Button.displayName = 'GardenButton';
