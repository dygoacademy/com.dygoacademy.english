import { Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';

import { DatabaseService } from '../../database/database.service';
import type { StudyGoal } from '../profiles/dto/update-onboarding.dto';
import { FIRST_BED_TITLES } from '../profiles/profiles.service';
import { ACTIVE_BED_TOPIC } from '../srs/srs.service';
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
  /** READY words in the bed. */
  word_count: number;
  /** READY words the learner hasn't planted yet. */
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
  /** Every planted word, fruit first, then ripe, then growing (oldest first within). */
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

// uws is RLS-scoped to the caller, so `uws.id is null` = not planted by them.
const BED_STATE = `
  select t.id as topic_id, t.title,
         count(tw.id)::int as word_count,
         count(tw.id) filter (where uws.id is null)::int as unplanted_count
    from public.topics t
    left join public.topic_words tw on tw.topic_id = t.id and tw.status = 'READY'
    left join public.user_word_srs uws on uws.topic_word_id = tw.id
   where t.id = $1
   group by t.id`;

// Public beds the learner never planted from, with how many of their words
// are already in the learner's garden. $1 = goal title pattern (or null).
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
   group by t.id, g.name, g.library_shelf`;

function toState(row: BedState): BedState {
  return { ...row, harvest_ready: row.word_count > 0 && row.unplanted_count === 0 };
}

/** Seeds & Harvest Phase 1: the learner's beds, S2 Bed harvest and S3 seed packets. */
@Injectable()
export class BedsService {
  constructor(private readonly db: DatabaseService) {}

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
             from public.topic_words tw
             join public.user_word_srs uws on uws.topic_word_id = tw.id
             left join public.master_lexicon ml on ml.id = tw.lexicon_id
            where tw.topic_id = $1 and tw.status = 'READY'
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
  async plant(userId: string, topicId: string): Promise<BedState> {
    return this.db.withUser(userId, async (client) => {
      const next = await bedState(client, topicId);
      if (!next) throw new NotFoundException('Topic not found.');
      const current = await activeTopicId(client);
      if (current === topicId) return next;
      if (current) {
        const left = await bedState(client, current);
        const harvested = !!left?.harvest_ready;
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
