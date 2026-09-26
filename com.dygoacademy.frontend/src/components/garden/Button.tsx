'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';

import { ButtonTwoLine, buttonClassName, type buttonVariants } from './buttonStyles';
import { gcn } from './cn';
import { Spinner } from './Spinner';

/**
 * Garden buttons, sized as in the canvas:
 *
 * - primary: 58px, radius 18, terracotta, 17px bold, a 4px "pressable"
 *   shadow (A1 Continue mission, A2 See your garden bloom, A5 Quick
 *   revive). With `secondLine` the label and second line sit on the left
 *   and `trailingIcon` on the right (A1).
 * - forest: 60px, radius 18, forest, 17px bold, forest shadow (Show answer).
 * - secondary: 52px, 1px border, radius 16, white, 15px bold forest text
 *   (A7 Quiz). As in the canvas, a link (`asChild`) sizes its content box,
 *   so its border adds 2px; a <button> is 52px border included.
 *
 * Other canvas sizes (54px challenge button, 52px topic-bed button) are the
 * same variants with a height / radius / font-size className.
 *
 * Pressing moves the button down 2px and halves the shadow over 80ms. A
 * client component: its click handler swallows presses while loading.
 */
export interface GardenButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Optional second line (13px) under the label; the pair sits on the left. */
  secondLine?: React.ReactNode;
  /** Icon at the right end (with `secondLine`) or before the label. */
  trailingIcon?: React.ReactNode;
  /** Icon before the label (e.g. the water drop). */
  leadingIcon?: React.ReactNode;
  /** Shows a spinner, keeps the label, and blocks presses. */
  loading?: boolean;
  /** Render as the single child element (e.g. a Next `<Link>`). */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, GardenButtonProps>(
  (
    {
      className,
      variant,
      secondLine,
      trailingIcon,
      leadingIcon,
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
    const classes = buttonClassName(variant, { twoLine: Boolean(secondLine), className });

    // asChild (e.g. a Next <Link> styled as a button): the child brings its
    // own content (use ButtonTwoLine for the two-line layout).
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={gcn(classes, variant === 'secondary' && 'box-content')}
          onClick={onClick}
          {...props}
        >
          {children}
        </Slot>
      );
    }

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
        {secondLine ? (
          <>
            <ButtonTwoLine
              label={
                <>
                  {loading ? <Spinner /> : null}
                  {children}
                </>
              }
              secondLine={secondLine}
            />
            {trailingIcon}
          </>
        ) : (
          <>
            {loading ? <Spinner /> : leadingIcon}
            {children}
            {trailingIcon}
          </>
        )}
      </button>
    );
  },
);
Button.displayName = 'GardenButton';
