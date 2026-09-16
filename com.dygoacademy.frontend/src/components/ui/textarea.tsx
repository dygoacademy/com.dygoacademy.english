import * as React from 'react';

import { cn } from '@/lib/utils';

/** shadcn/ui's Textarea, added 2026-09-05. Same 16px-floor reasoning as Input. */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[4rem] w-full resize-none rounded-md border px-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
