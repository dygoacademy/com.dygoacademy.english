import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PoolClient } from 'pg';

import { DatabaseService } from '../../database/database.service';
import type { StudyGoal } from '../profiles/dto/update-onboarding.dto';
import { FIRST_BED_TITLES } from '../profiles/profiles.service';
import { ACTIVE_BED_TOPIC } from '../srs/srs.service';
import { recordEvent } from './product-events';
import {
  levelLabel,
  middleHalf,
  pickPackets,
  type PacketCandidate,
  type PacketKind,
} from './beds.plan';

/** A bed's planting state (GET /beds/active, POST /beds). */
export interface BedState {
  topic_id: string;
  title: string;
  /** READY words in the bed, plus the seeds the learner's fruit dropped into it. */
  word_count: number;
  /** Of those, the ones not planted yet (a seed still enriching counts). */
  unplanted_count: number;
  /** Every word is planted (S2 Bed harvest shows). */
  harvest_ready: boolean;
}

export type HarvestStage = 'fruit' | 'ripe' | 'growing';

/** S2 Bed harvest. */
export interface BedHarvest extends BedState {
  /** No other bed was harvested before ("Your first harvest"). */
  first_harvest: boolean;
  fruit: number;
  ripe: number;
  growing: number;
  /** Every planted word (dropped seeds too), fruit first, then ripe, then growing (oldest first within). */
  words: Array<{ topic_word_id: string; word: string; stage: HarvestStage }>;
}

/** One S3 seed packet. */
export interface SeedPacketView {
  kind: PacketKind;
  topic_id: string;
  title: string;
  collection: string;
  /** "B2", "B1–B2" or null. */
  level: string | null;
  word_count: number;
  known_count: number;
}

export interface SeedPackets {
  packets: SeedPacketView[];
  /** For the Same goal packet's line ("Next on your Road to Band 7"). */
  study_goal: string | null;
  target_band: number | null;
}

/** S1 Fruit drops seeds: the seeds one fruit word dropped. */
export interface SeedDrop {
  dropped_by: { topic_word_id: string; word: string };
  bed: { topic_id: string; title: string };
  /** The bed's words before and after these seeds ("grows from 5 words to 7"). */
  bed_words_before: number;
  bed_words_after: number;
  seeds: Array<{
    topic_word_id: string;
    word: string;
    kind: 'pairing' | 'family' | 'synonym';
    part_of_speech: string | null;
    /** English definition; null while the seed is still enriching. */
    meaning: string | null;
    audio_url: string | null;
  }>;
}

const DROP_HEAD = `
  select sd.dropped_by as topic_word_id, coalesce(mf.normalized_word, f.source_word) as word,
         t.id as bed_topic_id, t.title as bed_title
    from public.seed_drops sd
    join public.topic_words f on f.id = sd.dropped_by
    left join public.master_lexicon mf on mf.id = f.lexicon_id
    join public.topics t on t.id = sd.bed_topic_id`;

// The seed's lexicon entry, or the one with its spelling while the
// enrichment job hasn't linked it yet.
const DROP_SEEDS = `
  select sd.topic_word_id, s.source_word as word, sd.kind,
         ml.part_of_speech, ml.definition_en as meaning, ml.audio_url
    from public.seed_drops sd
    join public.topic_words s on s.id = sd.topic_word_id
    left join public.master_lexicon ml
           on ml.id = coalesce(s.lexicon_id,
                               (select m.id from public.master_lexicon m
                                 where m.normalized_word = lower(trim(s.source_word))
                                   and m.language_code = s.language_code))
   where sd.dropped_by = $1 and s.status <> 'FAILED'
   order by case sd.kind when 'pairing' then 0 when 'family' then 1 else 2 end, s.created_at`;

// A bed's words for this learner: its READY words plus the seeds their
// fruit dropped into it (Phase 2; seed_drops is RLS-scoped, so only theirs).
// A seed still enriching counts as queued, so the bed isn't harvested yet.
const BED_WORDS = `
    select tw.id from public.topic_words tw where tw.topic_id = t.id and tw.status = 'READY'
    union
    select sd.topic_word_id from public.seed_drops sd
      join public.topic_words s on s.id = sd.topic_word_id
     where sd.bed_topic_id = t.id and s.status <> 'FAILED'`;

// uws is RLS-scoped to the caller, so `uws.id is null` = not planted by them.
const BED_STATE = `
  select t.id as topic_id, t.title,
         count(w.id)::int as word_count,
         count(w.id) filter (where uws.id is null)::int as unplanted_count
    from public.topics t
    left join lateral (${BED_WORDS}) w on true
    left join public.user_word_srs uws on uws.topic_word_id = w.id
   where t.id = $1
   group by t.id`;

// Public beds the learner never planted from and with words left to plant,
// with how many of their words are already in the learner's garden. $1 = goal title pattern (or null).
const CANDIDATES = `
  with mine as (
    select distinct tw.lexicon_id
      from public.user_word_srs uws
      join public.topic_words tw on tw.id = uws.topic_word_id
     where tw.lexicon_id is not null
  ),
  used as (
    select ub.topic_id from public.user_beds ub where ub.user_id = auth.uid()
    union
    select p.first_topic_id from public.profiles p
     where p.id = auth.uid() and p.first_topic_id is not null
  )
  select t.id as topic_id, t.title, g.name as collection, g.library_shelf as shelf,
         count(tw.id)::int as word_count,
         count(tw.id) filter (where tw.lexicon_id in (select lexicon_id from mine))::int as known_count,
         coalesce(array_agg(ml.cefr_level::text order by ml.cefr_level)
                    filter (where ml.cefr_level is not null), '{}') as levels,
         coalesce(t.title ~* $1, false) as fits_goal
    from public.topics t
    join public.groups g on g.id = t.group_id
    join public.topic_words tw on tw.topic_id = t.id and tw.status = 'READY'
    left join public.master_lexicon ml on ml.id = tw.lexicon_id
   where t.is_public and not t.is_my_words
     and t.id not in (select topic_id from used)
   group by t.id, g.name, g.library_shelf
  having count(tw.id) filter (where not exists (
           select 1 from public.user_word_srs uws where uws.topic_word_id = tw.id)) > 0`;

function toState(row: BedState): BedState {
  return { ...row, harvest_ready: row.word_count > 0 && row.unplanted_count === 0 };
}

/** Seeds & Harvest Phase 1: the learner's beds, S2 Bed harvest and S3 seed packets. */
@Injectable()
export class BedsService {
  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  /** The bed today's planting takes words from, or null when the learner has none. */
  async active(userId: string): Promise<BedState | null> {
    return this.db.withUser(userId, async (client) => {
      const topicId = await activeTopicId(client);
      return topicId ? bedState(client, topicId) : null;
    });
  }

  /** S2: what grew in a bed. */
  async harvest(userId: string, topicId: string): Promise<BedHarvest> {
    return this.db.withUser(userId, async (client) => {
      const state = await bedState(client, topicId);
      if (!state) throw new NotFoundException('Topic not found.');
      const words = (
        await client.query<{ topic_word_id: string; word: string; stage: HarvestStage }>(
          `select tw.id as topic_word_id, coalesce(ml.normalized_word, tw.source_word) as word,
                  case when uws.mastered_at is not null then 'fruit'
                       when uws.fsrs_state = 'Review' and not uws.is_leech then 'ripe'
                       else 'growing' end as stage
             from public.topics t
             cross join lateral (${BED_WORDS}) w
             join public.topic_words tw on tw.id = w.id
             join public.user_word_srs uws on uws.topic_word_id = tw.id
             left join public.master_lexicon ml on ml.id = tw.lexicon_id
            where t.id = $1
            order by case when uws.mastered_at is not null then 0
                          when uws.fsrs_state = 'Review' and not uws.is_leech then 1
                          else 2 end,
                     tw.created_at, tw.id`,
          [topicId],
        )
      ).rows;
      const before = await client.query<{ n: number }>(
        `select count(*)::int as n from public.user_beds
          where user_id = auth.uid() and status = 'harvested' and topic_id <> $1`,
        [topicId],
      );
      const count = (stage: HarvestStage) => words.filter((w) => w.stage === stage).length;
      return {
        ...state,
        first_harvest: (before.rows[0]?.n ?? 0) === 0,
        fruit: count('fruit'),
        ripe: count('ripe'),
        growing: count('growing'),
        words,
      };
    });
  }

  /** S1: the oldest seed drop the learner hasn't seen yet, or null. */
  async nextDrop(userId: string): Promise<SeedDrop | null> {
    // Flag `seed_drops` off: S1 never shows, even for drops made while it was on.
    if (!(this.config?.get<boolean>('seedDrops.enabled', false) ?? false)) return null;
    return this.db.withUser(userId, async (client) => {
      const head = await client.query<{ topic_word_id: string }>(
        `${DROP_HEAD} where sd.seen_at is null order by sd.created_at, sd.dropped_by limit 1`,
      );
      return head.rows[0] ? seedDrop(client, head.rows[0].topic_word_id) : null;
    });
  }

  /** S1: the seeds `droppedBy` (a fruit topic word) dropped. */
  async drop(userId: string, droppedBy: string): Promise<SeedDrop> {
    return this.db.withUser(userId, async (client) => {
      const drop = await seedDrop(client, droppedBy);
      if (!drop) throw new NotFoundException('Seed drop not found.');
      return drop;
    });
  }

  /** S1 was shown: the drop no longer comes back from nextDrop. */
  async markDropSeen(userId: string, droppedBy: string): Promise<void> {
    await this.db.queryAs(
      userId,
      `update public.seed_drops set seen_at = now() where dropped_by = $1 and seen_at is null`,
      [droppedBy],
    );
  }

  /** S3: the 3 seed packets for the next bed (beds.plan.ts pickPackets). */
  async packets(userId: string): Promise<SeedPackets> {
    return this.db.withUser(userId, async (client) => {
      const profile = (
        await client.query<{
          cefr_level: string | null;
          study_goal: StudyGoal | null;
          target_band: number | null;
        }>(
          `select cefr_level::text as cefr_level, study_goal, target_band::float8 as target_band
             from public.profiles where id = auth.uid()`,
        )
      ).rows[0];
      const goal = profile?.study_goal ? (FIRST_BED_TITLES[profile.study_goal] ?? null) : null;
      const rows = (
        await client.query<
          Omit<PacketCandidate, 'level_low' | 'level_high'> & { levels: string[] }
        >(CANDIDATES, [goal])
      ).rows;
      const shelves = (
        await client.query<{ shelf: string | null; active: boolean }>(
          `select g.library_shelf as shelf, t.id = ${ACTIVE_BED_TOPIC} as active
             from public.topics t
             join public.groups g on g.id = t.group_id
            where t.id in (select ub.topic_id from public.user_beds ub where ub.user_id = auth.uid())
               or t.id = ${ACTIVE_BED_TOPIC}`,
        )
      ).rows;
      const candidates: PacketCandidate[] = rows.map(({ levels, ...c }) => ({
        ...c,
        ...middleHalf(levels),
      }));
      const packets = pickPackets(candidates, {
        level: profile?.cefr_level ?? null,
        planted_shelves: shelves.map((s) => s.shelf),
        current_shelf: shelves.find((s) => s.active)?.shelf ?? null,
      });
      for (const p of packets) {
        await recordEvent(client, 'packet_shown', { slot: p.kind, topic_id: p.topic_id });
      }
      return {
        packets: packets.map((p) => ({
          kind: p.kind,
          topic_id: p.topic_id,
          title: p.title,
          collection: p.collection,
          level: levelLabel(p.level_low, p.level_high),
          word_count: p.word_count,
          known_count: p.known_count,
        })),
        study_goal: profile?.study_goal ?? null,
        target_band: profile?.target_band ?? null,
      };
    });
  }

  /**
   * S3 "Plant <bed>": `topicId` becomes the active bed. The bed being left
   * becomes harvested when it had nothing left to plant, else resting.
   */
  async plant(userId: string, topicId: string, slot?: PacketKind): Promise<BedState> {
    return this.db.withUser(userId, async (client) => {
      const next = await bedState(client, topicId);
      if (!next) throw new NotFoundException('Topic not found.');
      const current = await activeTopicId(client);
      if (current === topicId) return next;
      if (current) {
        const left = await bedState(client, current);
        const harvested = !!left?.harvest_ready;
        if (harvested) await recordHarvest(client, current, topicId, slot);
        await client.query(
          `insert into public.user_beds (topic_id, status, harvested_at)
           values ($1, $2, case when $2 = 'harvested' then now() end)
           on conflict (user_id, topic_id) do update
             set status = excluded.status,
                 harvested_at = case when excluded.status = 'harvested'
                                     then coalesce(public.user_beds.harvested_at, now()) end,
                 updated_at = now()`,
          [current, harvested ? 'harvested' : 'resting'],
        );
      }
      await client.query(
        `insert into public.user_beds (topic_id, status)
         values ($1, 'active')
         on conflict (user_id, topic_id) do update
           set status = 'active', harvested_at = null, started_at = now(), updated_at = now()`,
        [topicId],
      );
      return next;
    });
  }
}

async function activeTopicId(client: PoolClient): Promise<string | null> {
  const res = await client.query<{ topic_id: string | null }>(
    `select ${ACTIVE_BED_TOPIC} as topic_id`,
  );
  return res.rows[0]?.topic_id ?? null;
}

async function bedState(client: PoolClient, topicId: string): Promise<BedState | null> {
  const res = await client.query<BedState>(BED_STATE, [topicId]);
  return res.rows[0] ? toState(res.rows[0]) : null;
}

async function seedDrop(client: PoolClient, droppedBy: string): Promise<SeedDrop | null> {
  const head = (
    await client.query<{
      topic_word_id: string;
      word: string;
      bed_topic_id: string;
      bed_title: string;
    }>(`${DROP_HEAD} where sd.dropped_by = $1 limit 1`, [droppedBy])
  ).rows[0];
  if (!head) return null;
  const seeds = (await client.query<SeedDrop['seeds'][number]>(DROP_SEEDS, [droppedBy])).rows;
  const bed = await bedState(client, head.bed_topic_id);
  const after = bed?.word_count ?? seeds.length;
  return {
    dropped_by: { topic_word_id: head.topic_word_id, word: head.word },
    bed: { topic_id: head.bed_topic_id, title: head.bed_title },
    bed_words_before: Math.max(0, after - seeds.length),
    bed_words_after: after,
    seeds,
  };
}

/**
 * Analytics: `bed_harvested` for the bed being left and `packet_chosen` for
 * the packet that replaces it. minutes_since_harvest = since the bed's last
 * word was planted (when it became ready to harvest).
 */
async function recordHarvest(
  client: PoolClient,
  bedTopicId: string,
  chosenTopicId: string,
  slot: PacketKind | undefined,
): Promise<void> {
  const stats = (
    await client.query<{
      words_total: number;
      fruit_count: number;
      days_active: number | null;
      minutes: number | null;
    }>(
      `select count(*)::int as words_total,
              count(*) filter (where uws.mastered_at is not null)::int as fruit_count,
              (select extract(day from now() - ub.started_at)::int from public.user_beds ub
                where ub.user_id = auth.uid() and ub.topic_id = t.id) as days_active,
              (extract(epoch from now() - max(uws.created_at)) / 60)::int as minutes
         from public.topics t
         cross join lateral (${BED_WORDS}) w
         join public.user_word_srs uws on uws.topic_word_id = w.id
        where t.id = $1
        group by t.id`,
      [bedTopicId],
    )
  ).rows[0];
  await recordEvent(client, 'bed_harvested', {
    topic_id: bedTopicId,
    words_total: stats?.words_total ?? 0,
    fruit_count: stats?.fruit_count ?? 0,
    days_active: stats?.days_active ?? null,
  });
  await recordEvent(client, 'packet_chosen', {
    slot: slot ?? null,
    topic_id: chosenTopicId,
    minutes_since_harvest: stats?.minutes ?? null,
  });
}
