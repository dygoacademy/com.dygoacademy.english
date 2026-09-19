'use client';

import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Segmented single-select control (`type="single"`), styled to match
 * `button.tsx`'s variant/size pattern. Added 2026-09-18 for AudioButton's
 * playback-speed picker — a proper Radix primitive (aria-pressed state,
 * roving tabindex, one-of-N semantics) in place of two hand-rolled
 * `<button>`s each managing their own `aria-pressed`.
 */
const toggleGroupItemVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary',
  {
    variants: {
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 w-8',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

const ToggleGroup = ToggleGroupPrimitive.Root;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleGroupItemVariants>
>(({ className, size, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(toggleGroupItemVariants({ size, className }))}
    {...props}
  />
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
