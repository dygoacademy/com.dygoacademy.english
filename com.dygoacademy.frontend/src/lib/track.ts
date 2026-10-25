import { apiClient } from '@/lib/api-client';

/**
 * Pronunciation v2 analytics (Dylan's plan of 2026-10-25, answer 4): one
 * event to our own API (`POST /events` → product_events), nothing to a
 * third party. Fire and forget: a failed send never gets in the learner's
 * way. Props are snake_case, as the API checks them.
 */
export type TrackEvent =
  | {
      name: 'pron_scored';
      props: {
        word_id: string;
        overall: number;
        result: 'pass' | 'almost' | 'retry';
        weak_syllable: string | null;
        attempt_no: number;
      };
    }
  | { name: 'pron_not_heard'; props: { word_id: string; reason: 'quiet' | 'noisy' | 'other' } }
  | {
      name: 'pron_chip_played';
      props: { word_id: string; syllable: string; state: 'clean' | 'close' | 'wobbly' };
    }
  | {
      name: 'pron_word_played';
      props: { word_id: string; voice: 'native' | 'you'; screen: 'P1' | 'P3' | 'P4' };
    }
  | { name: 'pron_say_again'; props: { word_id: string; from_result: boolean } }
  | { name: 'pron_skipped'; props: { word_id: string } }
  | { name: 'pron_word_blocked'; props: { word_id: string; reason: 'no_syllables' } };

export function track(event: TrackEvent): void {
  try {
    void apiClient.post('/events', event).catch(() => undefined);
  } catch {
    // Never in the learner's way.
  }
}
