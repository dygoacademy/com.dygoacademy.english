/** Queue names — kebab-case with a -queue suffix (tech spec §3.5). */
export const ENRICHMENT_QUEUE = 'enrichment-queue';
export const NOTIFICATION_QUEUE = 'notification-queue';
export const MAINTENANCE_QUEUE = 'maintenance-queue';
/** Phase 13 speech checks (2026-10-06): one job per recording, ids only, never audio. */
export const SPEECH_CHECK_QUEUE = 'speech-check-queue';

/** Job names. */
export const ENRICH_WORD_JOB = 'enrich-word';
/** Fill in master_lexicon.audio_url for a word that already has its text fields. */
export const AUDIO_BACKFILL_JOB = 'audio-backfill';
/** Fill in word_translations for a master_lexicon word missing a meaning-locale row (scripts/translations-backfill.js). */
export const TRANSLATIONS_BACKFILL_JOB = 'translations-backfill';
export const NOTIFICATION_TICK_JOB = 'notification-tick';
export const PARTITION_MAINTENANCE_JOB = 'partition-maintenance';
export const SPEECH_CHECK_JOB = 'speech-check';
/** Voice donation: delete queued donor codes' recordings and those over 3 years old. */
export const VOICE_DONATION_CLEANUP_JOB = 'voice-donation-cleanup';

/** Scheduler ids — stable, so a restart updates the schedule instead of duplicating it. */
export const NOTIFICATION_TICK_SCHEDULER = 'notification-tick-every-15m';
export const PARTITION_MAINTENANCE_SCHEDULER = 'partition-maintenance-daily';
export const VOICE_DONATION_CLEANUP_SCHEDULER = 'voice-donation-cleanup-daily';

/** Job payload schemas. */
export interface WordEnrichmentJob {
  topicWordId: string;
  word: string;
  languageCode: string;
  targetCEFR?: 'A2' | 'B1' | 'B2' | 'C1';
  triggeredByUserId: string;
}

export interface AudioBackfillJob {
  lexiconId: string;
  word: string;
  languageCode: string;
  /** Replace the word's existing clip (audio-backfill --word), not only fill a missing one. */
  remake?: boolean;
}

export interface TranslationsBackfillJob {
  lexiconId: string;
  /** Which meaning locales are missing for this word — only these are (re)written. */
  missingLocales: Array<'vi-VN' | 'zh-CN'>;
  definitionEn: string;
  exampleSentence: string;
}

export interface NotificationCronJob {
  /** ISO timestamp of the 15-minute tick this job represents. */
  tickAt: string;
}

export interface PartitionMaintenanceJob {
  /** How many months beyond the current one to keep provisioned. */
  monthsAhead: number;
}

/**
 * A queued speech check. Ids and text only: the recording stays in the API
 * process's memory (SpeechCheckStore) and never goes into Redis, which
 * saves to disk (Phase 13 D2: recordings are never stored).
 */
/** A sentence check (The Pond) or, with `kind: 'word'`, one word (Pronunciation, 2026-10-11). */
export type SpeechCheckJob =
  | {
      kind?: 'sentence';
      checkId: string;
      userId: string;
      sentence: string;
      targetIndex: number;
      /** Voice donation metadata: the accent practised and the device type. */
      accent?: 'UK' | 'US';
      device?: 'phone' | 'tablet' | 'desktop';
    }
  | {
      kind: 'word';
      checkId: string;
      userId: string;
      word: string;
      /** The word's IPA for the practised accent (null when the word has none). */
      ipa: string | null;
      lexiconId: string;
      accent?: 'UK' | 'US';
      device?: 'phone' | 'tablet' | 'desktop';
    };
