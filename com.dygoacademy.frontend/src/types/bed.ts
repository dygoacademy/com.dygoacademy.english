/**
 * Seeds & Harvest Phase 1 (backend `modules/beds/beds.service.ts`). Field
 * names mirror the API exactly (snake_case).
 */

/** `GET /beds/active`, `POST /beds`. */
export interface BedState {
  topic_id: string;
  title: string;
  /** READY words in the bed. */
  word_count: number;
  /** READY words the learner hasn't planted yet. */
  unplanted_count: number;
  /** Every word is planted: S2 Bed harvest shows. */
  harvest_ready: boolean;
}

export type HarvestStage = 'fruit' | 'ripe' | 'growing';

/** `GET /beds/:topicId/harvest` (S2). */
export interface BedHarvest extends BedState {
  first_harvest: boolean;
  fruit: number;
  ripe: number;
  growing: number;
  /** Planted words, fruit first, then ripe, then growing. */
  words: Array<{ topic_word_id: string; word: string; stage: HarvestStage }>;
}

export type SeedPacketKind = 'bee' | 'goal' | 'new';

export interface SeedPacket {
  kind: SeedPacketKind;
  topic_id: string;
  title: string;
  /** The library collection, e.g. "IELTS Academic". */
  collection: string;
  /** "B2", "B1–B2" or null. */
  level: string | null;
  word_count: number;
  /** Words of the bed already in the learner's garden. */
  known_count: number;
}

/** `GET /beds/packets` (S3). */
export interface SeedPackets {
  packets: SeedPacket[];
  study_goal: string | null;
  target_band: number | null;
}

export type SeedKind = 'pairing' | 'family' | 'synonym';

/** `GET /beds/seed-drops/next`, `GET /beds/seed-drops/:droppedBy` (S1). */
export interface SeedDrop {
  dropped_by: { topic_word_id: string; word: string };
  bed: { topic_id: string; title: string };
  bed_words_before: number;
  bed_words_after: number;
  seeds: Array<{
    topic_word_id: string;
    word: string;
    kind: SeedKind;
    part_of_speech: string | null;
    /** English definition; null while the seed is still enriching. */
    meaning: string | null;
    audio_url: string | null;
  }>;
}
