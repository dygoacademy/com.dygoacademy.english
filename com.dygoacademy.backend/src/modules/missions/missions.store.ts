/**
 * UI-6 U6-2 — daily missions storage helpers, shared by `MissionsService`
 * (reads) and `SrsService`/quiz grading (progress bumps inside their own
 * review transaction). Plain functions over a pg-like client so SrsModule
 * needs no dependency on MissionsModule (which itself imports SrsModule's
 * timezone resolver).
 *
 * Decisions (phase 12 plan, "UI-6 finish"): 3 missions per local day —
 * REVIEW_DUE (target = due words at the day's first read, min 1; 0 due →
 * already done), LEARN_NEW (5 new words), QUIZ (1 finished quiz). Golden
 * Bloom = all 3 done that day.
 *
 * Phase 13 SE1 (2026-10-06): on alternate days (`isSpeakDay`) the 3rd
 * mission is SPEAK ("Say 3 ripe words": 3 different sentences spoken in
 * The Pond) instead of QUIZ, when the learner has at least SPEAK_TARGET
 * words with a speaking item. Still 3 missions a day.
 *
 * Daily goal missions (2026-10-15, docs/plans/Daily goal missions plan.md):
 * the day's rows now come from `daily_goal_minutes` via missions.plan.ts,
 * 2 to 4 a day; Golden Bloom = every row of the day done.
 */

import { planDay, type DayPlan } from './missions.plan';

export type MissionType = 'REVIEW_DUE' | 'LEARN_NEW' | 'QUIZ' | 'SPEAK';

/** Display order; a day has 2 to 4 of these (missions.plan.ts). */
export const MISSION_TYPES: MissionType[] = ['REVIEW_DUE', 'LEARN_NEW', 'QUIZ', 'SPEAK'];

/** SE1: SPEAK takes QUIZ's place on odd days (days since 1970-01-01 of the local date). */
export function isSpeakDay(localDate: string): boolean {
  return Math.round(Date.parse(`${localDate}T00:00:00Z`) / 86_400_000) % 2 === 1;
}

export interface Mission {
  type: MissionType;
  target: number;
  progress: number;
  done: boolean;
}

/** The subset of pg's PoolClient these helpers use. */
export interface MissionClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

async function rowsOf<T>(client: MissionClient, text: string, params: unknown[]): Promise<T[]> {
  const res = await client.query<T>(text, params);
  return res?.rows ?? [];
}

/** `now`'s calendar date (YYYY-MM-DD) in `timezone`. */
export function localDateOf(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Creates `localDate`'s rows from the learner's daily goal
 * (missions.plan.ts `planDay`) if the day has none yet: 2 to 4 rows.
 * `extraDue` lets a caller that just took a due card out of the due set
 * (a review landing before the day's first read) still count it. The
 * plan is fixed on the day's first read, so a goal change applies from
 * the next day.
 */
export async function ensureMissions(
  client: MissionClient,
  userId: string,
  localDate: string,
  extraDue = 0,
): Promise<void> {
  const existing = await rowsOf<{ n: string }>(
    client,
    `select count(*) as n from public.daily_missions where user_id = $1 and local_date = $2`,
    [userId, localDate],
  );
  if (Number(existing[0]?.n ?? 0) > 0) return;

  const plan = await planToday(client, userId, localDate, extraDue);
  const values: unknown[] = [userId, localDate];
  const rows = plan.missions.map((m) => {
    values.push(m.type, Math.max(m.target, 1), m.target === 0);
    const i = values.length;
    // A REVIEW_DUE with nothing due is done from the start (target stays >= 1).
    // Typed casts: the target param appears twice, and Postgres can't infer
    // one type for it from a smallint column and an integer `else 0`.
    return `($1, $2, $${i - 2}::text, $${i - 1}::int, case when $${i}::boolean then $${i - 1}::int else 0 end,
             case when $${i}::boolean then now() end)`;
  });
  await client.query(
    `insert into public.daily_missions (user_id, local_date, type, target, progress, completed_at)
     values ${rows.join(',\n            ')}
     on conflict (user_id, local_date, type) do nothing`,
    values,
  );
}

/** Today's plan from the learner's goal, due words and speakable words. */
export async function planToday(
  client: MissionClient,
  userId: string,
  localDate: string,
  extraDue = 0,
): Promise<DayPlan> {
  const due = await rowsOf<{ n: string }>(
    client,
    `select count(*) as n from public.user_word_srs where user_id = $1 and next_due_at <= now()`,
    [userId],
  );
  const goal = await rowsOf<{ daily_goal_minutes: number | null }>(
    client,
    `select daily_goal_minutes from public.profiles where id = $1`,
    [userId],
  );
  // Words the learner can read that have a speaking item (RLS scopes topic_words).
  const speakable = await rowsOf<{ n: string }>(
    client,
    `select count(distinct tw.lexicon_id) as n
       from public.topic_words tw
       join public.speaking_items si on si.lexicon_id = tw.lexicon_id
      where tw.status = 'READY'`,
    [],
  );
  return planDay({
    goalMinutes: goal[0]?.daily_goal_minutes ?? null,
    dueCount: Number(due[0]?.n ?? 0) + extraDue,
    speakable: Number(speakable[0]?.n ?? 0),
    speakDay: isSpeakDay(localDate),
  });
}

/**
 * New words a session may still plant today: what's left of today's
 * LEARN_NEW mission (0 on a catch-up day, which has none). Ensures the
 * day's rows first.
 */
export async function newWordAllowance(
  client: MissionClient,
  userId: string,
  localDate: string,
): Promise<number> {
  await ensureMissions(client, userId, localDate);
  const rows = await rowsOf<{ target: number; progress: number }>(
    client,
    `select target, progress from public.daily_missions
      where user_id = $1 and local_date = $2 and type = 'LEARN_NEW'`,
    [userId, localDate],
  );
  const row = rows[0];
  return row ? Math.max(0, Number(row.target) - Number(row.progress)) : 0;
}

/** +1 progress (capped at target); stamps completed_at when it reaches target. */
export async function bumpMission(
  client: MissionClient,
  userId: string,
  localDate: string,
  type: MissionType,
): Promise<void> {
  await client.query(
    `update public.daily_missions
        set progress = least(progress + 1, target),
            completed_at = coalesce(completed_at, case when progress + 1 >= target then now() end)
      where user_id = $1 and local_date = $2 and type = $3`,
    [userId, localDate, type],
  );
}

/** Ensure today's rows, then bump one mission — what a review/quiz calls. */
export async function recordMissionProgress(
  client: MissionClient,
  userId: string,
  timezone: string,
  now: Date,
  type: MissionType,
  extraDue = 0,
): Promise<void> {
  const localDate = localDateOf(now, timezone);
  await ensureMissions(client, userId, localDate, extraDue);
  await bumpMission(client, userId, localDate, type);
}
