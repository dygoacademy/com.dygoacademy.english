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

/**
 * "N words" or "N words · M focus words" — Phase 9, "Topics as
 * Collections" mockup subtext, added 2026-09-21. Shared by `TopicCard`,
 * `TopicCollectionRow`, and `TopicGridCard` (three separate components
 * that each independently render a topic's word count) rather than
 * tripling the same string-building logic across them — the exact kind
 * of drift `constants/layout.ts`'s `CONTENT_WIDTH` comment already warns
 * about for a different value. Takes the two raw string counts, not a
 * `TopicSummary`, so this file doesn't need to import a domain type just
 * to format two numbers. The "· M focus words" clause only appears when
 * there's at least one -- an topic with zero leeches doesn't need "· 0
 * focus words" cluttering every row.
 */
export function formatTopicWordCount(wordCount: string, focusWordCount: string): string {
  const words = Number(wordCount);
  const base = `${words} ${words === 1 ? 'word' : 'words'}`;
  const focus = Number(focusWordCount);
  return focus > 0 ? `${base} · ${focus} focus ${focus === 1 ? 'word' : 'words'}` : base;
}

/**
 * "Good evening, Sarah" — Home's greeting, matching the Phase 9 mockup
 * ("GOOD EVENING, SARAH") — live-requested 2026-09-21 ("check the topic
 * design mockup, that look like haven't implement the indicate yet").
 * `displayName` is null for the common case (real registrations never
 * collect one; `SrsStats.display_name`'s own comment has the full
 * reasoning) -- the name clause is dropped entirely rather than showing
 * a placeholder. `hour` defaults to the real local hour but takes an
 * explicit override so this stays a pure, testable function rather than
 * needing `Date` mocked at the call site.
 */
export function formatGreeting(displayName: string | null, hour: number = new Date().getHours()): string {
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return displayName ? `${timeOfDay}, ${displayName}` : timeOfDay;
}


