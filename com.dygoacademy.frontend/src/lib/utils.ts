import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class merger — combines conditional Tailwind classes and resolves
 * conflicting utilities (e.g. `p-2` vs `p-4`) in favor of the last one.
 * Used by every shadcn/ui primitive in components/ui.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
