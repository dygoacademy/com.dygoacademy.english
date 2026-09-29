/** Queue names — kebab-case with a -queue suffix (tech spec §3.5). */
export const ENRICHMENT_QUEUE = 'enrichment-queue';
export const NOTIFICATION_QUEUE = 'notification-queue';
export const MAINTENANCE_QUEUE = 'maintenance-queue';

/** Job names. */
export const ENRICH_WORD_JOB = 'enrich-word';
/** Fill in master_lexicon.audio_url for a word that already has its text fields. */
export const AUDIO_BACKFILL_JOB = 'audio-backfill';
/** Fill in word_translations for a master_lexicon word missing a meaning-locale row (scripts/translations-backfill.js). */
export const TRANSLATIONS_BACKFILL_JOB = 'translations-backfill';
export const NOTIFICATION_TICK_JOB = 'notification-tick';
export const PARTITION_MAINTENANCE_JOB = 'partition-maintenance';

/** Scheduler ids — stable, so a restart updates the schedule instead of duplicating it. */
export const NOTIFICATION_TICK_SCHEDULER = 'notification-tick-every-15m';
export const PARTITION_MAINTENANCE_SCHEDULER = 'partition-maintenance-daily';

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
