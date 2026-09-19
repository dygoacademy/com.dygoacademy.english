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

/**
 * Formats a raw IPA transcription for flashcard display, wrapping it in
 * phonemic slashes. Real Gemini-enriched words already come back with
 * slashes baked in (tech spec 4.2's example output: "/ɪˈfem.ər.əl/"), but the
 * hand-seeded QA fixture (013_hello_world_test_word.sql) doesn't -- so any
 * slashes already present are stripped before re-wrapping, otherwise the
 * two sources render inconsistently ("US /tum/" vs "US //tum//").
 */
export function formatIpa(value: string | null): string | null {
  const trimmed = value?.trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : null;
}


