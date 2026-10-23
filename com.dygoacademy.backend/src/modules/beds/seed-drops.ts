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
 * row tying it to the fruit word and its bed. The caller enqueues their
 * enrichment after the transaction commits.
 */

/** 1–2 seeds per fruit (plan, "How many"; Phase 4 tunes it). */
export const SEEDS_PER_FRUIT = 2;

interface Queryable {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface DroppedSeed {
  topic_word_id: string;
  source_word: string;
  language_code: string;
}

const RELATIONS = `
  with fruit as (
    select tw.id, tw.topic_id, tw.lexicon_id
      from public.topic_words tw
     where tw.id = $1 and tw.lexicon_id is not null
  )
  select r.related_word, r.kind
    from public.word_relations r
    join fruit f on f.lexicon_id = r.lexicon_id
   where not exists (
           select 1
             from public.user_word_srs uws
             join public.topic_words t2 on t2.id = uws.topic_word_id
             left join public.master_lexicon m2 on m2.id = t2.lexicon_id
            where coalesce(m2.normalized_word, lower(trim(t2.source_word))) = lower(trim(r.related_word)))
     and not exists (
           select 1 from public.topic_words t3
            where t3.topic_id in (f.topic_id, $2)
              and lower(trim(t3.source_word)) = lower(trim(r.related_word)))
   order by case r.kind when 'pairing' then 0 when 'family' then 1 else 2 end, r.rank, r.related_word
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
    await client.query<{ related_word: string; kind: string }>(RELATIONS, [
      fruitTopicWordId,
      myWords,
    ])
  ).rows;
  const seeds: DroppedSeed[] = [];
  for (const r of relations) {
    const inserted = (
      await client.query<DroppedSeed>(
        `insert into public.topic_words (topic_id, source_word, language_code, added_by)
         values ($1, $2, 'en', $3)
         on conflict (topic_id, source_word, language_code) do nothing
         returning id as topic_word_id, source_word, language_code`,
        [myWords, r.related_word.trim(), userId],
      )
    ).rows[0];
    if (!inserted) continue;
    await client.query(
      `insert into public.seed_drops (topic_word_id, bed_topic_id, dropped_by, kind)
       select $1, tw.topic_id, tw.id, $3 from public.topic_words tw where tw.id = $2`,
      [inserted.topic_word_id, fruitTopicWordId, r.kind],
    );
    seeds.push(inserted);
  }
  return seeds;
}
