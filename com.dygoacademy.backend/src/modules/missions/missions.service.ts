import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { resolveUserTimezone } from '../srs/srs.service';
import {
  MISSION_TYPES,
  Mission,
  MissionClient,
  MissionType,
  ensureMissions,
  localDateOf,
} from './missions.store';

export interface TodayMissions {
  date: string;
  missions: Mission[];
  goldenBloom: boolean;
}

export interface MissionDay {
  date: string;
  /** Missions completed that local day (0–3). */
  done: number;
  goldenBloom: boolean;
}

/** UI-6 U6-2 — the learner's daily missions (A1/A3/A4). */
@Injectable()
export class MissionsService {
  constructor(private readonly db: DatabaseService) {}

  /** Today's 3 missions, created on the first read of the learner's local day. */
  async today(userId: string, detectedTz?: string, now: Date = new Date()): Promise<TodayMissions> {
    return this.db.withUser(userId, async (pg) => {
      const client = pg as unknown as MissionClient;
      const timezone = await resolveUserTimezone(
        async <T extends Record<string, unknown>>(text: string, params: unknown[]) =>
          (await client.query<T>(text, params)).rows,
        userId,
        detectedTz,
      );
      const date = localDateOf(now, timezone);
      await ensureMissions(client, userId, date);
      const res = await client.query<{
        type: MissionType;
        target: number;
        progress: number;
        completed_at: Date | null;
      }>(
        `select type, target, progress, completed_at
           from public.daily_missions
          where user_id = $1 and local_date = $2`,
        [userId, date],
      );
      const byType = new Map(res.rows.map((r) => [r.type, r]));
      const missions: Mission[] = MISSION_TYPES.filter((t) => byType.has(t)).map((t) => {
        const r = byType.get(t)!;
        return {
          type: t,
          target: Number(r.target),
          progress: Number(r.progress),
          done: r.completed_at !== null,
        };
      });
      return {
        date,
        missions,
        goldenBloom: missions.length === MISSION_TYPES.length && missions.every((m) => m.done),
      };
    });
  }

  /** The trailing 7 local days (oldest first, today last). Read-only — creates no rows. */
  async week(userId: string, detectedTz?: string, now: Date = new Date()): Promise<MissionDay[]> {
    const timezone = await resolveUserTimezone(
      (text, params) => this.db.queryAs(userId, text, params),
      userId,
      detectedTz,
    );
    const today = localDateOf(now, timezone);
    const dates: string[] = [];
    const base = new Date(`${today}T00:00:00Z`);
    for (let i = 6; i >= 0; i--) {
      dates.push(new Date(base.getTime() - i * 86_400_000).toISOString().slice(0, 10));
    }
    const rows = await this.db.queryAs<{ local_date: string; done: string }>(
      userId,
      `select local_date::text as local_date,
              count(*) filter (where completed_at is not null) as done
         from public.daily_missions
        where user_id = $1 and local_date between $2::date and $3::date
        group by local_date`,
      [userId, dates[0], today],
    );
    const doneBy = new Map(rows.map((r) => [r.local_date, Number(r.done)]));
    return dates.map((date) => {
      const done = doneBy.get(date) ?? 0;
      return { date, done, goldenBloom: done >= MISSION_TYPES.length };
    });
  }
}
