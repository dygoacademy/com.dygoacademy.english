import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

/**
 * UI-G RD-2 (phase 12 implementation plan.md, "store rain days") — the
 * backend side of `migrations/20260927_group_rain_days.sql`. A rain day is
 * a group-wide goal ("water N words of the shared beds today") that ends at
 * 23:59 in the starting ADMIN's time zone. One per group per local day,
 * enforced by the unique index (23505), not by this service.
 *
 * All three SQL functions are SECURITY DEFINER and re-check the caller's
 * role themselves; this service only maps their error codes to HTTP and
 * turns bigint strings into numbers. Totals and the caller's own count
 * only, never who (FR-1.2).
 */

export const RAIN_DAY_WORDS = [5, 10, 20] as const;
export type RainDayWords = (typeof RAIN_DAY_WORDS)[number];
export const RAIN_DAY_DEFAULT_WORDS: RainDayWords = 10;

/** What `POST …/sprint` returns about the rain day it just started. */
export interface StartedRainDay {
  id: string;
  endsAt: string;
  wordsPerGardener: number;
}

/** One rain day as members see it: totals plus the caller's own count. */
export interface RainDaySummary {
  id: string;
  wordsPerGardener: number;
  startsAt: string;
  endsAt: string;
  gardeners: number;
  done: number;
  mine: number;
}

/** `GET /groups/:id/rain-day`. */
export interface RainDayStatus {
  current: RainDaySummary | null;
  last: RainDaySummary | null;
}

const PG_INSUFFICIENT_PRIVILEGE = '42501';
const PG_INVALID_PARAMETER = '22023';
const PG_UNIQUE_VIOLATION = '23505';

export const RAIN_DAY_ALREADY_RUNNING = 'A rain day is already running today';

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

@Injectable()
export class RainDayService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Starts today's rain day. 403 not ADMIN, 409 one already running today
   * (the caller must not send a push in that case), 400 bad word count.
   */
  async start(
    userId: string,
    groupId: string,
    wordsPerGardener: number = RAIN_DAY_DEFAULT_WORDS,
    message?: string | null,
  ): Promise<StartedRainDay> {
    try {
      const [row] = await this.db.queryAs<{
        id: string;
        ends_at: Date | string;
        words_per_gardener: number | string;
      }>(
        userId,
        `select id, ends_at, words_per_gardener
           from public.start_group_rain_day($1, $2::smallint, $3)`,
        [groupId, wordsPerGardener, message?.trim() || null],
      );
      return {
        id: row.id,
        endsAt: toIso(row.ends_at),
        wordsPerGardener: Number(row.words_per_gardener),
      };
    } catch (err) {
      throw this.mapError(err, 'Only a group ADMIN can start a rain day.');
    }
  }

  /** Current and last finished rain day. Members only (403). */
  async status(userId: string, groupId: string): Promise<RainDayStatus> {
    try {
      const rows = await this.db.queryAs<Record<string, unknown>>(
        userId,
        `select id, words_per_gardener, starts_at, ends_at, is_current, gardeners, done, mine
           from public.group_rain_day_status($1)`,
        [groupId],
      );
      const toSummary = (r: Record<string, unknown>): RainDaySummary => ({
        id: String(r.id),
        wordsPerGardener: Number(r.words_per_gardener),
        startsAt: toIso(r.starts_at),
        endsAt: toIso(r.ends_at),
        gardeners: Number(r.gardeners),
        done: Number(r.done),
        mine: Number(r.mine),
      });
      const current = rows.find((r) => r.is_current === true);
      const last = rows.find((r) => r.is_current !== true);
      return {
        current: current ? toSummary(current) : null,
        last: last ? toSummary(last) : null,
      };
    } catch (err) {
      throw this.mapError(err, 'Only group members can see its rain day.');
    }
  }

  /** ADMIN cancels today's running rain day. 404 if none is running. */
  async cancel(userId: string, groupId: string): Promise<void> {
    let cancelled: boolean;
    try {
      const [row] = await this.db.queryAs<{ cancelled: boolean }>(
        userId,
        `select public.cancel_group_rain_day($1) as cancelled`,
        [groupId],
      );
      cancelled = row?.cancelled === true;
    } catch (err) {
      throw this.mapError(err, 'Only a group ADMIN can cancel a rain day.');
    }
    if (!cancelled) throw new NotFoundException('No rain day is running for this group.');
  }

  private mapError(err: unknown, forbidden: string): unknown {
    const code = (err as { code?: string } | null)?.code;
    if (code === PG_INSUFFICIENT_PRIVILEGE) return new ForbiddenException(forbidden);
    if (code === PG_UNIQUE_VIOLATION) return new ConflictException(RAIN_DAY_ALREADY_RUNNING);
    if (code === PG_INVALID_PARAMETER) {
      return new BadRequestException('wordsPerGardener must be 5, 10 or 20.');
    }
    return err;
  }
}
