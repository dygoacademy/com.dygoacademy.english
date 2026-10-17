/**
 * A4 This week: weekly missions storage (docs/plans/A4 weekly missions
 * implementation plan.md). Plain functions over a pg-like client, like
 * missions.store.ts, so SrsService (rescue, water) and the speaking flows
 * (sentence, sound) can count and settle the reward inside their own
 * transaction.
 *
 * One `weekly_missions` row per learner and local week (Monday), created on
 * the week's first read: it fixes the sound and the goals. Counts are read
 * from the tables that already record the work:
 *   rescue   = `rescued_word_ids` (a leech answered right in the leech drill)
 *   water    = distinct words reviewed on flashcards this week (fallback)
 *   sentence = distinct speaking items accepted (bloom / fruit) this week
 *   sound    = words pollinated this week (`speaking_harvests`) with the sound
 * All done → +1 rain barrel, once per week (`rewarded_at`), max 3 held.
 */

import { STREAK_FREEZES_PER_WEEK } from '../srs/srs.service';
import type { MissionClient } from './missions.store';
import { localDateOf } from './missions.store';
import {
  STREAK_FREEZES_MAX,
  WEEKLY_GOALS,
  daysLeftInWeek,
  hasSound,
  pickSound,
  soundByKey,
  weekStartOf,
  weeklyGoals,
  type WeeklyGoals,
  type WeeklyMissionKey,
} from './weekly.plan';

export interface WeeklyMission {
  key: WeeklyMissionKey;
  goal: number;
  count: number;
  done: boolean;
}

/** `GET /missions/weekly`. */
export interface WeeklyMissions {
  /** The local Monday, YYYY-MM-DD. */
  weekStart: string;
  /** Days after today until Sunday (0 on Sunday). */
  daysLeft: number;
  sound: { key: string; label: string; examples: string[] };
  /** Always 3, in display order: rescue (or water), sentence, sound. */
  missions: WeeklyMission[];
  rewardEarned: boolean;
  /** Rain barrels held now. */
  freezes: number;
  /** Wilting words right now (the Rescue row's line). */
  wilting: number;
  /** Up to 5 topic word ids planted or watered this week that have a sentence (Speak button). */
  sentenceWords: string[];
  /** Up to 3 topic word ids with the sound, not pollinated yet (Say button). */
  soundWords: string[];
}

interface WeekRow {
  sound: string;
  goals: WeeklyGoals;
  rescued: number;
  rewarded_at: Date | null;
}

interface BeeWord {
  topic_word_id: string;
  word: string;
  ipa_uk: string | null;
  ipa_us: string | null;
  pollinated: boolean;
  /** Pollinated before this week: it can't count toward this week's sound. */
  pollinated_before: boolean;
}

async function rowsOf<T>(client: MissionClient, text: string, params: unknown[]): Promise<T[]> {
  const res = await client.query<T>(text, params);
  return res?.rows ?? [];
}

/** Local midnight of `weekStart` in `timezone`, as a timestamptz expression over $n/$m. */
const WEEK_FROM = (date: string, tz: string) => `((${date}::date)::timestamp at time zone ${tz})`;

/**
 * The learner's words that have a speaking item (bee words), one per word,
 * from their beds: the ones topics search calls theirs (own or group beds,
 * private topics, library topics they started).
 */
async function beeWords(
  client: MissionClient,
  userId: string,
  weekStart: string,
  timezone: string,
): Promise<BeeWord[]> {
  return rowsOf<BeeWord>(
    client,
    `with beds as (
       select t.id
         from public.topics t
         left join public.groups g on g.id = t.group_id
        where g.owner_id = $1
           or not t.is_public
           or exists (
                select 1 from public.group_members me
                 where me.group_id = t.group_id and me.user_id = $1)
           or exists (
                select 1 from public.topic_words stw
                  join public.user_word_srs su on su.topic_word_id = stw.id
                 where stw.topic_id = t.id and su.user_id = $1)
     )
     select distinct on (ml.id)
            tw.id as topic_word_id, ml.normalized_word as word, ml.ipa_uk, ml.ipa_us,
            h.id is not null as pollinated,
            coalesce(h.created_at < ${WEEK_FROM('$2', '$3')}, false) as pollinated_before
       from beds b
       join public.topic_words tw on tw.topic_id = b.id and tw.status = 'READY'
       join public.master_lexicon ml on ml.id = tw.lexicon_id
       left join public.speaking_harvests h on h.lexicon_id = ml.id and h.user_id = $1
      where exists (select 1 from public.speaking_items si where si.lexicon_id = tw.lexicon_id)
      order by ml.id, tw.created_at, tw.id`,
    [userId, weekStart, timezone],
  );
}

async function leechCount(client: MissionClient, userId: string): Promise<number> {
  const rows = await rowsOf<{ n: string }>(
    client,
    `select count(*) as n from public.user_word_srs where user_id = $1 and is_leech`,
    [userId],
  );
  return Number(rows[0]?.n ?? 0);
}

/** The week's row, created on the first read (sound + goals fixed then). */
export async function ensureWeek(
  client: MissionClient,
  userId: string,
  weekStart: string,
  timezone: string,
): Promise<WeekRow> {
  const read = () =>
    rowsOf<{ sound: string; goals: WeeklyGoals; rescued: number; rewarded_at: Date | null }>(
      client,
      `select sound, goals, coalesce(cardinality(rescued_word_ids), 0) as rescued, rewarded_at
         from public.weekly_missions
        where user_id = $1 and week_start = $2::date`,
      [userId, weekStart],
    );
  const existing = await read();
  if (existing[0]) return { ...existing[0], rescued: Number(existing[0].rescued) };

  // One client: queries run one after another (pg doesn't take concurrent queries).
  // Words pollinated before this week can't be pollinated again (once per word).
  const words = (await beeWords(client, userId, weekStart, timezone)).filter(
    (w) => !w.pollinated_before,
  );
  const leeches = await leechCount(client, userId);
  const { sound, goal } = pickSound(weekStart, words);
  const goals = weeklyGoals(leeches, goal);
  if (goals.rescue !== undefined) goals.rescue = Math.min(WEEKLY_GOALS.rescue, leeches);
  await client.query(
    `insert into public.weekly_missions (user_id, week_start, sound, goals)
     values ($1, $2::date, $3, $4::jsonb)
     on conflict (user_id, week_start) do nothing`,
    [userId, weekStart, sound.key, JSON.stringify(goals)],
  );
  const created = await read();
  const row = created[0] ?? { sound: sound.key, goals, rescued: 0, rewarded_at: null };
  return { ...row, rescued: Number(row.rescued) };
}

/** This week's count for each of the row's missions. */
async function weekCounts(
  client: MissionClient,
  userId: string,
  row: WeekRow,
  weekStart: string,
  timezone: string,
): Promise<WeeklyMission[]> {
  const from = WEEK_FROM('$2', '$3');
  const params = [userId, weekStart, timezone];
  const water =
    row.goals.water !== undefined
      ? await rowsOf<{ n: string }>(
          client,
          `select count(distinct topic_word_id) as n
             from public.review_logs
            where user_id = $1 and source = 'flashcard' and reviewed_at >= ${from}`,
          params,
        )
      : [];
  const sentence = await rowsOf<{ n: string }>(
    client,
    `select count(distinct item_id) as n
       from public.speaking_attempts
      where user_id = $1 and stage in ('bloom', 'fruit') and created_at >= ${from}`,
    params,
  );
  const harvests = await rowsOf<{ ipa_uk: string | null; ipa_us: string | null }>(
    client,
    `select ml.ipa_uk, ml.ipa_us
       from public.speaking_harvests h
       join public.master_lexicon ml on ml.id = h.lexicon_id
      where h.user_id = $1 and h.created_at >= ${from}`,
    params,
  );
  const sound = soundByKey(row.sound);
  const mission = (key: WeeklyMissionKey, goal: number, raw: number): WeeklyMission => {
    const count = Math.min(raw, goal);
    return { key, goal, count, done: count >= goal };
  };
  const first =
    row.goals.water !== undefined
      ? mission('water', row.goals.water, Number(water[0]?.n ?? 0))
      : mission('rescue', row.goals.rescue ?? WEEKLY_GOALS.rescue, row.rescued);
  return [
    first,
    mission('sentence', row.goals.sentence, Number(sentence[0]?.n ?? 0)),
    mission(
      'sound',
      row.goals.sound,
      harvests.filter((h) => hasSound(sound, [h.ipa_uk, h.ipa_us])).length,
    ),
  ];
}

/**
 * +1 rain barrel for the week, once (`rewarded_at`). A stale weekly refill is
 * applied first (max(current, 2), as applyStreakFreezes does), so Monday's
 * refill can't wipe the bonus; never above STREAK_FREEZES_MAX (at 3 nothing
 * is added). True when this call granted it.
 */
async function grantReward(
  client: MissionClient,
  userId: string,
  weekStart: string,
): Promise<boolean> {
  const won = await rowsOf<{ week_start: string }>(
    client,
    `update public.weekly_missions
        set rewarded_at = now()
      where user_id = $1 and week_start = $2::date and rewarded_at is null
      returning week_start`,
    [userId, weekStart],
  );
  if (won.length === 0) return false;
  await client.query(
    `update public.profiles
        set streak_freezes_available = least($3::int,
              case when freezes_refilled_on is null or freezes_refilled_on < $2::date
                   then greatest(streak_freezes_available, $4::int)
                   else streak_freezes_available end + 1),
            freezes_refilled_on = greatest(coalesce(freezes_refilled_on, $2::date), $2::date)
      where id = $1`,
    [userId, weekStart, STREAK_FREEZES_MAX, STREAK_FREEZES_PER_WEEK],
  );
  return true;
}

/** Counts the week and grants the reward when all 3 are done. What a counted event calls. */
export async function settleWeek(
  client: MissionClient,
  userId: string,
  timezone: string,
  now: Date,
): Promise<{ weekStart: string; row: WeekRow; missions: WeeklyMission[] }> {
  const weekStart = weekStartOf(localDateOf(now, timezone));
  const row = await ensureWeek(client, userId, weekStart, timezone);
  const missions = await weekCounts(client, userId, row, weekStart, timezone);
  if (row.rewarded_at === null && missions.every((m) => m.done)) {
    if (await grantReward(client, userId, weekStart)) row.rewarded_at = now;
  }
  return { weekStart, row, missions };
}

/** A wilting word answered right in the leech drill: counts once a week. */
export async function recordRescue(
  client: MissionClient,
  userId: string,
  timezone: string,
  now: Date,
  topicWordId: string,
): Promise<void> {
  const weekStart = weekStartOf(localDateOf(now, timezone));
  await ensureWeek(client, userId, weekStart, timezone);
  await client.query(
    `update public.weekly_missions
        set rescued_word_ids = array_append(rescued_word_ids, $3::uuid)
      where user_id = $1 and week_start = $2::date and not ($3::uuid = any(rescued_word_ids))`,
    [userId, weekStart, topicWordId],
  );
}

/** Everything A4 shows: the week's missions (settling the reward), sound examples and button words. */
export async function readWeek(
  client: MissionClient,
  userId: string,
  timezone: string,
  now: Date,
): Promise<WeeklyMissions> {
  const { weekStart, row, missions } = await settleWeek(client, userId, timezone, now);
  const sound = soundByKey(row.sound);
  const words = await beeWords(client, userId, weekStart, timezone);
  const leeches = await leechCount(client, userId);
  const sentenceWords = await rowsOf<{ id: string }>(
    client,
    `select tw.id
       from public.review_logs rl
       join public.topic_words tw on tw.id = rl.topic_word_id
      where rl.user_id = $1 and rl.reviewed_at >= ${WEEK_FROM('$2', '$3')}
        and tw.status = 'READY'
        and exists (select 1 from public.speaking_items si where si.lexicon_id = tw.lexicon_id)
      group by tw.id
      order by max(rl.reviewed_at) desc
      limit 5`,
    [userId, weekStart, timezone],
  );
  const freezes = await rowsOf<{ streak_freezes_available: number | null }>(
    client,
    `select streak_freezes_available from public.profiles where id = $1`,
    [userId],
  );
  const withSound = words
    .filter((w) => hasSound(sound, [w.ipa_uk, w.ipa_us]))
    .sort((a, b) => Number(a.pollinated) - Number(b.pollinated) || a.word.localeCompare(b.word));
  return {
    weekStart,
    daysLeft: daysLeftInWeek(localDateOf(now, timezone)),
    sound: {
      key: sound.key,
      label: sound.label,
      examples: withSound.slice(0, 3).map((w) => w.word),
    },
    missions,
    rewardEarned: row.rewarded_at !== null,
    freezes: Number(freezes[0]?.streak_freezes_available ?? STREAK_FREEZES_PER_WEEK),
    wilting: leeches,
    sentenceWords: sentenceWords.map((r) => r.id),
    soundWords: withSound
      .filter((w) => !w.pollinated)
      .slice(0, 3)
      .map((w) => w.topic_word_id),
  };
}

/**
 * Runs weekly-mission work inside a savepoint of the caller's transaction:
 * if it fails (e.g. the table isn't there yet), the review, answer or
 * attempt it rides on still commits. False when it failed.
 */
export async function weeklySafely(
  client: MissionClient,
  work: () => Promise<unknown>,
  onError: (err: unknown) => void = () => undefined,
): Promise<boolean> {
  await client.query('savepoint weekly_missions');
  try {
    await work();
    await client.query('release savepoint weekly_missions');
    return true;
  } catch (err) {
    await client.query('rollback to savepoint weekly_missions');
    onError(err);
    return false;
  }
}
