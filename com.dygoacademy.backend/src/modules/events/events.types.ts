/**
 * Pronunciation v2 analytics (Dylan's plan of 2026-10-25, answer 4): the
 * events the app may send with `POST /events`, each with the props it may
 * carry. They land in public.product_events (20261025_pron_events.sql).
 * Seeds & Harvest events are written by the API itself, never sent.
 */
export const CLIENT_EVENTS = {
  pron_scored: ['word_id', 'overall', 'result', 'weak_syllable', 'attempt_no'],
  pron_not_heard: ['word_id', 'reason'],
  pron_chip_played: ['word_id', 'syllable', 'state'],
  pron_word_played: ['word_id', 'voice', 'screen'],
  pron_say_again: ['word_id', 'from_result'],
  pron_skipped: ['word_id'],
  pron_word_blocked: ['word_id', 'reason'],
} as const;

export type ClientEventName = keyof typeof CLIENT_EVENTS;
export const CLIENT_EVENT_NAMES = Object.keys(CLIENT_EVENTS) as ClientEventName[];

/** A prop value: short text, a number, true/false or null. */
export type EventPropValue = string | number | boolean | null;
/** Longest text prop. */
export const EVENT_TEXT_MAX = 80;
