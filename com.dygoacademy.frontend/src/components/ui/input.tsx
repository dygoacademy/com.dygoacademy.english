import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui's Input, added 2026-09-05. `text-base` (16px), not `text-sm`,
 * is load-bearing, not a style choice: font-size under 16px is what makes
 * iOS Safari auto-zoom the whole page on focus (see globals.css's global
 * @media fix, added for exactly this after it kept recurring
 * field-by-field). Every hand-rolled `<input>` this migration replaces
 * had to get that fix applied one at a time; a shared component means
 * the next new form field gets it for free.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border-2 border-primary bg-transparent px-3 py-2.5 text-base outline-none transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
