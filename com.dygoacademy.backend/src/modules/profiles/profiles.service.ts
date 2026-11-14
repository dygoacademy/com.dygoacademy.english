import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { tierFor } from '../missions/missions.plan';
import { localDateOf } from '../missions/missions.store';
import { resolveUserTimezone, SrsService } from '../srs/srs.service';
import { hasBand, StudyGoal, TARGET_BANDS, UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * The caller's own settings, as `GET` / `PATCH /profiles/me` return them
 * (UI-L locales; UI-6 U6-4 adds `english_variety` and `daily_goal_minutes`;
 * A8d adds `recall_first`).
 */
export interface ProfileLanguage {
  id: string;
  ui_locale: string | null;
  meaning_locale: string | null;
  english_variety: string;
  daily_goal_minutes: number;
  /** A8d: hide the translation on the review card until tapped (default true). */
  recall_first: boolean;
}

/** UI-6 keepsake kinds (user_keepsakes.kind; 20261001_retention.sql). */
export type KeepsakeKind = 'FIRST_HARVEST' | 'STREAK' | 'GOLDEN_BLOOMS';

/** Thresholds per kind (decisions, 2026-10-01). FIRST_HARVEST is value 0, reached at 1 mastered word. */
export const KEEPSAKE_THRESHOLDS: Record<KeepsakeKind, number[]> = {
  FIRST_HARVEST: [0],
  STREAK: [7, 30, 100],
  GOLDEN_BLOOMS: [10, 50],
};

export interface EarnedKeepsake {
  kind: KeepsakeKind;
  value: number;
  earned_at: string;
}

/** The next keepsake of a kind still to earn: `progress` of `target`. */
export interface NextKeepsake {
  kind: KeepsakeKind;
  value: number;
  progress: number;
  target: number;
}

export interface Keepsakes {
  earned: EarnedKeepsake[];
  next: NextKeepsake[];
  golden_blooms: number;
}

const PROFILE_COLUMNS =
  'id, ui_locale, meaning_locale, english_variety, daily_goal_minutes, recall_first';

/**
 * Onboarding OB1–OB5, as `GET` / `PATCH /profiles/me/onboarding` return it
 * (20261008_onboarding.sql). `onboarded_at` null = not finished yet.
 */
export interface Onboarding {
  onboarded_at: string | null;
  cefr_level: string | null;
  study_goal: StudyGoal | null;
  target_band: number | null;
  first_topic_id: string | null;
}

// numeric comes back from pg as a string; the API sends a number.
const ONBOARDING_COLUMNS =
  'onboarded_at, cefr_level::text as cefr_level, study_goal, ' +
  'target_band::float8 as target_band, first_topic_id';

/**
 * The first bed for each goal (OB3 is gone, 2026-10-11): a library topic
 * whose title starts a word with this (Postgres `~*`, `\m` = word start).
 * Topics have no slugs, so titles are matched; with no match, the biggest
 * library topic is used (as OB3's seed packets were ranked). Each pattern
 * names the beds of the goal's collection in the beta library
 * (database/content/library_beta.csv, 2026-10-24), so S3's Same goal
 * packet finds them too. All its beds have 12 words, so the oldest wins:
 * the file's first bed. IELTS leaves out the tier ladder's Core and Band
 * beds, which share Foundation's created_at.
 */
export const FIRST_BED_TITLES: Record<StudyGoal, string> = {
  IELTS: '\\m(foundation vocabulary|academic word list|describing data)',
  IELTS_GENERAL:
    '\\m(housing and neighbourhood|shopping and money|letters and emails|health and wellbeing|education and training|community and local services)',
  PTE: '\\m(foundation vocabulary|academic word list|describing data)',
  WORK: '\\m(job hunting|emails at work|customer service|meetings and discussions|projects and deadlines|leadership and teamwork)',
  TRAVEL:
    '\\m(at the airport|getting around town|hotels and bookings|food and restaurants|sightseeing and culture|problems on the road)',
  LIFE: '\\m(home and family|food and cooking|hobbies and free time|feelings and moods|friends and social life|news and opinions)',
};

/**
 * Sets `first_topic_id` from the goal when it is still empty: the library
 * (public) topic with words whose title fits the goal, the biggest first;
 * else the biggest library topic. Runs under the caller's JWT, so only
 * topics they can see are picked. $1 = user, $2 = title pattern.
 */
const PICK_FIRST_BED = `
  update public.profiles p
     set first_topic_id = (
           select t.id
             from public.topics t
             join public.topic_words tw on tw.topic_id = t.id
            where t.is_public
            group by t.id
            order by (t.title ~* $2) desc, count(tw.id) desc, t.created_at
            limit 1),
         updated_at = now()
   where p.id = $1 and p.first_topic_id is null
  returning ${ONBOARDING_COLUMNS}`;

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * The caller's own profile preferences (UI-L; the Phase 11 WS1 preference
 * work; UI-6 U6-4 prefs + keepsakes). Every query runs through `queryAs`,
 * so RLS (`profiles_update_self`, `user_keepsakes_*_own`) limits reads and
 * writes to the caller's own rows.
 */
@Injectable()
export class ProfilesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly srs: SrsService,
  ) {}

  async getMine(userId: string): Promise<ProfileLanguage> {
    const rows = await this.db.queryAs<ProfileLanguage>(
      userId,
      `select ${PROFILE_COLUMNS} from public.profiles where id = $1`,
      [userId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Profile not found.');
    }
    return rows[0];
  }

  async updateMine(userId: string, dto: UpdateProfileDto): Promise<ProfileLanguage> {
    // Only the fields that were sent: undefined = keep, null = clear (locales only).
    const sets: string[] = [];
    const params: unknown[] = [userId];
    const fields: [keyof UpdateProfileDto, string][] = [
      ['uiLocale', 'ui_locale'],
      ['meaningLocale', 'meaning_locale'],
      ['englishVariety', 'english_variety'],
      ['dailyGoalMinutes', 'daily_goal_minutes'],
      ['recallFirst', 'recall_first'],
    ];
    for (const [key, column] of fields) {
      if (dto[key] !== undefined) {
        params.push(dto[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) {
      throw new BadRequestException(
        'Send uiLocale, meaningLocale, englishVariety, dailyGoalMinutes and/or recallFirst.',
      );
    }

    const rows = await this.db.queryAs<ProfileLanguage>(
      userId,
      `update public.profiles
          set ${sets.join(', ')},
              updated_at = now()
        where id = $1
        returning ${PROFILE_COLUMNS}`,
      params,
    );
    if (rows.length === 0) {
      throw new NotFoundException('Profile not found.');
    }
    if (dto.dailyGoalMinutes !== undefined)
      await this.raiseTodaysPlanting(userId, dto.dailyGoalMinutes);
    return rows[0];
  }

  /**
   * A bigger daily goal plants more today too (A2's "raise your daily goal
   * in Profile to plant more"): today's Plant mission, once created, rises
   * to the new goal's count. Never lowered, so words already planted stay
   * counted. A day with no Plant mission (watering filled it) is left alone.
   */
  private async raiseTodaysPlanting(userId: string, goalMinutes: number): Promise<void> {
    const plant = tierFor(goalMinutes).plant;
    await this.db.withUser(userId, async (client) => {
      const timezone = await resolveUserTimezone(
        async <T extends Record<string, unknown>>(text: string, params: unknown[]) =>
          (await client.query<T>(text, params)).rows,
        userId,
      );
      await client.query(
        `update public.daily_missions
            set target = $3,
                completed_at = case when progress >= $3 then completed_at end
          where user_id = $1 and local_date = $2 and type = 'LEARN_NEW' and target < $3`,
        [userId, localDateOf(new Date(), timezone), plant],
      );
    });
  }

  /** `GET /profiles/me/onboarding`: the caller's OB1–OB4 choices and whether OB5 is done. */
  async getOnboarding(userId: string): Promise<Onboarding> {
    const rows = await this.db.queryAs<Onboarding>(
      userId,
      `select ${ONBOARDING_COLUMNS} from public.profiles where id = $1`,
      [userId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Profile not found.');
    }
    return rows[0];
  }

  /**
   * `PATCH /profiles/me/onboarding`: saves the fields that were sent, and
   * with `complete` sets `onboarded_at` once. The band is checked against
   * the goal sent with it; the table's checks stay the last word.
   * `first_topic_id` must be a topic the caller can see: the read runs
   * under RLS in the same transaction as the update, so a hidden or
   * missing topic is a 404 (a foreign key alone would accept a topic the
   * caller can't read). When a goal is saved and the learner has no first
   * bed yet (and none is sent), one is picked from the goal
   * (`FIRST_BED_TITLES`). `timezone` fills `profiles.timezone` only while
   * it is still the 'UTC' "never set" default, so server reminders count
   * the learner's own day.
   */
  async updateOnboarding(userId: string, dto: UpdateOnboardingDto): Promise<Onboarding> {
    const band = this.checkBand(dto);
    if (dto.timezone !== undefined && !isValidTimezone(dto.timezone)) {
      throw new BadRequestException('timezone is not a known IANA time zone.');
    }

    const sets: string[] = [];
    const params: unknown[] = [userId];
    const set = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };
    if (dto.cefr_level !== undefined) set('cefr_level', dto.cefr_level);
    if (dto.study_goal !== undefined) {
      set('study_goal', dto.study_goal);
      set('target_band', band);
    }
    if (dto.first_topic_id !== undefined) set('first_topic_id', dto.first_topic_id);
    if (dto.timezone !== undefined) {
      params.push(dto.timezone);
      sets.push(
        `timezone = case when timezone is null or timezone = 'UTC' then $${params.length} else timezone end`,
      );
    }
    if (dto.complete === true) sets.push('onboarded_at = coalesce(onboarded_at, now())');
    if (sets.length === 0) {
      throw new BadRequestException(
        'Send cefr_level, study_goal (+ target_band), first_topic_id, timezone and/or complete.',
      );
    }

    return this.db.withUser(userId, async (client) => {
      if (dto.first_topic_id) {
        const topic = await client.query('select id from public.topics where id = $1', [
          dto.first_topic_id,
        ]);
        if (topic.rowCount === 0) {
          throw new NotFoundException('Topic not found.');
        }
      }
      const result = await client.query<Onboarding>(
        `update public.profiles
            set ${sets.join(', ')},
                updated_at = now()
          where id = $1
          returning ${ONBOARDING_COLUMNS}`,
        params,
      );
      if (result.rows.length === 0) {
        throw new NotFoundException('Profile not found.');
      }
      const row = result.rows[0];
      if (dto.study_goal !== undefined && dto.first_topic_id === undefined && !row.first_topic_id) {
        const picked = await client.query<Onboarding>(PICK_FIRST_BED, [
          userId,
          FIRST_BED_TITLES[dto.study_goal],
        ]);
        return picked.rows[0] ?? row;
      }
      return row;
    });
  }

  /** The band to store with `dto.study_goal`: null for goals without one, else in range. */
  private checkBand(dto: UpdateOnboardingDto): number | null {
    if (dto.study_goal === undefined) {
      if (dto.target_band !== undefined) {
        throw new BadRequestException('Send target_band together with study_goal.');
      }
      return null;
    }
    const band = dto.target_band ?? null;
    if (!hasBand(dto.study_goal)) {
      if (band !== null) {
        throw new BadRequestException(`study_goal ${dto.study_goal} has no target_band.`);
      }
      return null;
    }
    if (band === null) return null;
    const { min, max, step } = TARGET_BANDS[dto.study_goal];
    if (band < min || band > max || !Number.isInteger(band / step)) {
      throw new BadRequestException(
        `target_band for ${dto.study_goal} is ${min}–${max} in steps of ${step}.`,
      );
    }
    return band;
  }

  /**
   * UI-6 U6-4 — `GET /me/keepsakes`. Awards lazily: reads mastered words and
   * best streak from `SrsService.stats` and Golden Blooms (local days with all
   * 3 missions done) from `daily_missions`, inserts any newly reached
   * keepsake (`on conflict do nothing`, so `earned_at` stays the first time),
   * then returns everything earned plus the next one per kind.
   */
  async keepsakes(userId: string, detectedTz?: string): Promise<Keepsakes> {
    const stats = await this.srs.stats(userId, detectedTz);
    const bloomRows = await this.db.queryAs<{ blooms: string }>(
      userId,
      `select count(*)::text as blooms
         from (select local_date
                 from public.daily_missions
                where user_id = $1
                group by local_date
               having count(*) filter (where completed_at is not null) = count(*)) d`,
      [userId],
    );
    const goldenBlooms = Number(bloomRows[0]?.blooms ?? 0);

    const progressOf: Record<KeepsakeKind, number> = {
      FIRST_HARVEST: stats.mastered_words,
      STREAK: stats.best_streak_days,
      GOLDEN_BLOOMS: goldenBlooms,
    };
    const targetOf = (kind: KeepsakeKind, value: number) => (kind === 'FIRST_HARVEST' ? 1 : value);

    const reachedKinds: string[] = [];
    const reachedValues: number[] = [];
    const next: NextKeepsake[] = [];
    for (const kind of Object.keys(KEEPSAKE_THRESHOLDS) as KeepsakeKind[]) {
      let nextSet = false;
      for (const value of KEEPSAKE_THRESHOLDS[kind]) {
        const target = targetOf(kind, value);
        if (progressOf[kind] >= target) {
          reachedKinds.push(kind);
          reachedValues.push(value);
        } else if (!nextSet) {
          next.push({ kind, value, progress: progressOf[kind], target });
          nextSet = true;
        }
      }
    }

    if (reachedKinds.length > 0) {
      await this.db.queryAs(
        userId,
        `insert into public.user_keepsakes (user_id, kind, value)
         select $1, k, v from unnest($2::text[], $3::int[]) as t(k, v)
         on conflict (user_id, kind, value) do nothing`,
        [userId, reachedKinds, reachedValues],
      );
    }

    const earned = await this.db.queryAs<EarnedKeepsake>(
      userId,
      `select kind, value, earned_at
         from public.user_keepsakes
        where user_id = $1
        order by earned_at, kind, value`,
      [userId],
    );
    return { earned, next, golden_blooms: goldenBlooms };
  }
}
