import * as React from 'react';
import { cva } from 'class-variance-authority';

import { gcn } from './cn';

/**
 * Button styles, shared by <Button> (a client component) and by server
 * screens that style a Next <Link> as a button. See Button.tsx for the
 * canvas sizes of each variant.
 */
export const buttonVariants = cva(
  [
    'relative flex select-none items-center justify-center gap-2 text-center font-bold',
    'transition-[transform,box-shadow,background-color] duration-press ease-garden',
    'medium:max-w-[400px]',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: [
          'h-[58px] rounded-[18px] bg-garden-primary text-[17px] text-white shadow-press-primary',
          'active:translate-y-[2px] active:shadow-press-primary-down',
          'disabled:translate-y-0 disabled:bg-garden-disabled disabled:text-garden-text disabled:shadow-none',
        ],
        secondary: [
          'h-[52px] rounded-control border border-garden-border bg-garden-surface px-4',
          'text-[15px] text-garden-forest',
          'hover:bg-garden-surface-sunken active:bg-garden-surface-sunken',
          'disabled:border-garden-disabled disabled:text-garden-muted',
        ],
        forest: [
          'h-[60px] rounded-[18px] bg-garden-forest text-[17px] text-white shadow-press-forest',
          'active:translate-y-[2px] active:shadow-press-forest-down',
          'disabled:translate-y-0 disabled:bg-garden-disabled disabled:text-garden-text disabled:shadow-none',
        ],
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

/** The two-line label used by `secondLine`, exported for `asChild` links. */
export function ButtonTwoLine({
  label,
  secondLine,
}: {
  label: React.ReactNode;
  secondLine: React.ReactNode;
}) {
  return (
    <span className="flex flex-col text-left leading-[1.15]">
      <span className="text-[17px] font-bold">{label}</span>
      <span className="text-[13px] font-normal opacity-90">{secondLine}</span>
    </span>
  );
}

export function buttonClassName(
  variant: 'primary' | 'secondary' | 'forest' | null | undefined,
  options: { twoLine?: boolean; className?: string } = {},
) {
  return gcn(
    buttonVariants({ variant }),
    options.twoLine && 'justify-between px-5',
    options.className,
  );
}
