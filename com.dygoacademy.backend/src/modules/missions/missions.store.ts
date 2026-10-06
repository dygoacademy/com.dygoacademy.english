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
 */

export type MissionType = 'REVIEW_DUE' | 'LEARN_NEW' | 'QUIZ' | 'SPEAK';

/** Display order; a day has 3 of these (QUIZ or SPEAK third). */
export const MISSION_TYPES: MissionType[] = ['REVIEW_DUE', 'LEARN_NEW', 'QUIZ', 'SPEAK'];
export const MISSIONS_PER_DAY = 3;
export const LEARN_NEW_TARGET = 5;
export const QUIZ_TARGET = 1;
export const SPEAK_TARGET = 3;

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
 * Creates `localDate`'s 3 rows if they don't exist yet. `extraDue` lets a
 * caller that just took a due card out of the due set (a review landing
 * before the day's first read) still count it.
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
  if (Number(existing[0]?.n ?? 0) >= MISSIONS_PER_DAY) return;

  const due = await rowsOf<{ n: string }>(
    client,
    `select count(*) as n from public.user_word_srs where user_id = $1 and next_due_at <= now()`,
    [userId],
  );
  const dueCount = Number(due[0]?.n ?? 0) + extraDue;

  let third: { type: MissionType; target: number } = { type: 'QUIZ', target: QUIZ_TARGET };
  if (isSpeakDay(localDate)) {
    // Words the learner can read that have a speaking item (RLS scopes topic_words).
    const speakable = await rowsOf<{ n: string }>(
      client,
      `select count(distinct tw.lexicon_id) as n
         from public.topic_words tw
         join public.speaking_items si on si.lexicon_id = tw.lexicon_id
        where tw.status = 'READY'`,
      [],
    );
    if (Number(speakable[0]?.n ?? 0) >= SPEAK_TARGET)
      third = { type: 'SPEAK', target: SPEAK_TARGET };
  }

  await client.query(
    `insert into public.daily_missions (user_id, local_date, type, target, progress, completed_at)
     values ($1, $2, 'REVIEW_DUE', greatest($3::int, 1), case when $3::int = 0 then 1 else 0 end,
             case when $3::int = 0 then now() end),
            ($1, $2, 'LEARN_NEW', $4, 0, null),
            ($1, $2, $5, $6, 0, null)
     on conflict (user_id, local_date, type) do nothing`,
    [userId, localDate, dueCount, LEARN_NEW_TARGET, third.type, third.target],
  );
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
