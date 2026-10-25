import { recordEvent } from './product-events';
import { RELATION_ORDER_SQL, SEEDS_HARVEST } from './seeds-harvest.config';

/**
 * Seeds & Harvest Phase 2: fruit drops seeds (design S1). Runs inside the
 * review's own transaction (SrsService.applyReview), under the learner's
 * JWT, the moment a review first sets `mastered_at`.
 *
 * Up to SEEDS_PER_FRUIT reviewed `word_relations` of the fruit word, pairing
 * first, then word family, then synonym, skipping any word already in the
 * learner's garden, already in the fruit's bed, or already in their My
 * words. Each seed becomes a topic word in the learner's My words bed
 * (private, so the library bed itself never changes) with a `seed_drops`
 * row tying it to the fruit word and its bed. Only words with a lexicon
 * entry and native audio drop, so a seed is READY at once (no enrichment).
 */

/** 1–2 seeds per fruit (seeds-harvest.config.ts). */
export const SEEDS_PER_FRUIT = SEEDS_HARVEST.seedsPerFruit;

interface Queryable {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface DroppedSeed {
  topic_word_id: string;
  source_word: string;
  language_code: string;
}

// A relation drops only when its word already has a lexicon entry with
// native audio (plan section 2), and a fruit word drops once, ever: a
// retried review, or a word that loses and regains fruit, never drops twice.
const RELATIONS = `
  with fruit as (
    select tw.id, tw.topic_id, tw.lexicon_id
      from public.topic_words tw
     where tw.id = $1 and tw.lexicon_id is not null
       and not exists (select 1 from public.seed_drops sd where sd.dropped_by = tw.id)
  )
  select r.kind, ml.id as lexicon_id, ml.normalized_word as word
    from public.word_relations r
    join fruit f on f.lexicon_id = r.lexicon_id
    join public.master_lexicon ml
      on ml.normalized_word = lower(trim(r.related_word)) and ml.language_code = 'en'
   where ml.audio_url_us is not null and ml.audio_url_us <> ''
     and not exists (
           select 1
             from public.user_word_srs uws
             join public.topic_words t2 on t2.id = uws.topic_word_id
            where t2.lexicon_id = ml.id
               or lower(trim(t2.source_word)) = ml.normalized_word)
     and not exists (
           select 1 from public.topic_words t3
            where t3.topic_id in (f.topic_id, $2)
              and (t3.lexicon_id = ml.id or lower(trim(t3.source_word)) = ml.normalized_word))
   order by ${RELATION_ORDER_SQL('r.kind')}, r.rank, ml.normalized_word
   limit ${SEEDS_PER_FRUIT}`;

/** Drops the fruit word's seeds; [] when it has no reviewed relations left to give. */
export async function dropSeeds(
  client: Queryable,
  userId: string,
  fruitTopicWordId: string,
): Promise<DroppedSeed[]> {
  const myWords = (
    await client.query<{ id: string | null }>(`select public.my_words_topic_id() as id`)
  ).rows[0]?.id;
  if (!myWords) return [];
  const relations = (
    await client.query<{ kind: string; lexicon_id: string; word: string }>(RELATIONS, [
      fruitTopicWordId,
      myWords,
    ])
  ).rows;
  const seeds: DroppedSeed[] = [];
  for (const r of relations) {
    const inserted = (
      await client.query<DroppedSeed>(
        `insert into public.topic_words (topic_id, lexicon_id, source_word, language_code, status, added_by)
         values ($1, $2, $3, 'en', 'READY', $4)
         on conflict (topic_id, source_word, language_code) do nothing
         returning id as topic_word_id, source_word, language_code`,
        [myWords, r.lexicon_id, r.word, userId],
      )
    ).rows[0];
    if (!inserted) continue;
    const bed = (
      await client.query<{ bed_topic_id: string }>(
        `insert into public.seed_drops (topic_word_id, bed_topic_id, dropped_by, kind)
         select $1, tw.topic_id, tw.id, $3 from public.topic_words tw where tw.id = $2
         returning bed_topic_id`,
        [inserted.topic_word_id, fruitTopicWordId, r.kind],
      )
    ).rows[0];
    await recordEvent(client, 'seed_dropped', {
      word_id: fruitTopicWordId,
      seed_word_id: inserted.topic_word_id,
      kind: r.kind,
      bed_topic_id: bed?.bed_topic_id ?? null,
    });
    seeds.push(inserted);
  }
  return seeds;
}
