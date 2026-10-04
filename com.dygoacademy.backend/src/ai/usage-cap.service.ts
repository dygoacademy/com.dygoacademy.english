import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../database/database.service';

/** Paid APIs with a daily cap (api_usage_daily.provider). */
export type CappedProvider = 'gemini' | 'google_tts';

/** Thrown instead of making the paid call once today's cap is reached. */
export class UsageCapExceededError extends Error {
  constructor(
    readonly provider: CappedProvider,
    readonly limit: number,
  ) {
    super(`Daily ${provider} limit reached (${limit}); try again tomorrow (UTC)`);
    this.name = 'UsageCapExceededError';
  }
}

/**
 * Phase 13 S13: daily spend caps, so a bug, a retry loop or a busy beta day
 * can't run up the Google bill. `take()` adds the units to today's row in
 * `api_usage_daily` (UTC day) in one statement, only if the total stays
 * within the limit, so two calls racing for the last unit can't both pass.
 * Over the limit it throws UsageCapExceededError and the caller skips the
 * call (enrichment fails the job, quiz explanations are left out).
 *
 * Limits: `usage.geminiDailyCalls` (GEMINI_DAILY_CALL_LIMIT, default 1000)
 * and `usage.googleTtsDailyChars` (GOOGLE_TTS_DAILY_CHAR_LIMIT, default
 * 300000). Counts are attempts: a call that then fails at Google still
 * used its unit.
 */
@Injectable()
export class UsageCapService {
  private readonly logger = new Logger(UsageCapService.name);
  /** Days already warned about at 80 %, so the log says it once. */
  private readonly warned = new Set<string>();

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  limitFor(provider: CappedProvider): number {
    return provider === 'gemini'
      ? (this.config.get<number>('usage.geminiDailyCalls') ?? 1000)
      : (this.config.get<number>('usage.googleTtsDailyChars') ?? 300_000);
  }

  async take(provider: CappedProvider, units = 1): Promise<void> {
    const limit = this.limitFor(provider);
    const rows = await this.db.queryAsService<{ units: string; day: string }>(
      `insert into public.api_usage_daily (provider, day, units)
       select $1, (now() at time zone 'utc')::date, $2
        where $2 <= $3
       on conflict (provider, day) do update
         set units = public.api_usage_daily.units + excluded.units, updated_at = now()
         where public.api_usage_daily.units + excluded.units <= $3
       returning units, day::text`,
      [provider, units, limit],
    );
    if (rows.length === 0) {
      this.logger.warn(`${provider} daily limit ${limit} reached; call skipped`);
      throw new UsageCapExceededError(provider, limit);
    }
    const used = Number(rows[0].units);
    const key = `${provider}:${rows[0].day}`;
    if (used >= limit * 0.8 && !this.warned.has(key)) {
      this.warned.add(key);
      this.logger.warn(`${provider} at ${used} of ${limit} for ${rows[0].day} (80 %)`);
    }
  }
}
