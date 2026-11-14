import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

import { DatabaseService } from '../database/database.service';
import { buildReminderPayload } from '../modules/notifications/notification-message';
import { PushDispatchService } from '../modules/notifications/push-dispatch.service';
import {
  isCandidate,
  pickSmartHour,
  shouldSend,
  type ReminderSlot,
} from '../modules/notifications/reminder-rules';
import { computeSrsSummary, resolveUserTimezone } from '../modules/srs/srs.service';
import { NOTIFICATION_QUEUE, NotificationCronJob } from '../queues/queue.constants';

interface ScheduleRow {
  user_id: string;
  timezone: string;
  days: number[];
  channels: string[];
  smart: boolean;
  saved_minute: number;
  now_minute: number;
  iso_dow: number;
}

/**
 * Timezone-aware push dispatcher (Phase 3, Module 6).
 *
 * Runs on a 15-minute heartbeat and matches each user's configured local
 * reminder time. Timezones are stored as IANA strings so DST is handled by
 * the database rather than by a stored UTC offset that silently drifts
 * twice a year.
 *
 * QUARTER MATCHING: a UTC quarter-hour tick does not land on every user's
 * local reminder minute exactly (`Asia/Kathmandu`, UTC+5:45). Each
 * schedule's own local time is read in the database (`now() at time zone`)
 * and both it and `reminder_time` are cut into 15-minute quarters of the
 * local day (reminder-rules.ts); equal quarters = due. That catches exactly
 * one tick per reminder whatever the offset.
 *
 * A8c (2026-11-14): days of the week, quiet hours (22:00–07:00), channels
 * (push is the only sender) and Smart time, all in reminder-rules.ts.
 */
@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly pushDispatch: PushDispatchService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<NotificationCronJob>): Promise<void> {
    // service_role, not the bare `authenticator` query(): authenticator has
    // no table grants (see PushDispatchService), so this select failed with
    // "permission denied for table study_schedules" on every tick and no
    // reminder was ever sent (found 2026-10-16). The failure was silent
    // because BullMQ only marks the job failed; onFailed below logs it now.
    //
    // A8c (2026-11-14): the local time, weekday and saved time come back
    // per schedule; reminder-rules.ts decides (days, quiet hours 22:00–07:00,
    // live channels, Smart time). One row per learner since
    // 20261114_reminder_settings.sql.
    const rows = await this.db.queryAsService<ScheduleRow>(
      `select s.user_id, s.timezone, s.days, s.channels, s.smart,
              (extract(hour from s.reminder_time) * 60 + extract(minute from s.reminder_time))::int
                as saved_minute,
              (extract(hour from t.local) * 60 + extract(minute from t.local))::int as now_minute,
              extract(isodow from t.local)::int as iso_dow
         from public.study_schedules s
        cross join lateral (select now() at time zone s.timezone as local) t
        where s.is_enabled`,
    );

    const dueUsers: { user_id: string }[] = [];
    for (const row of rows) {
      const slot = toSlot(row);
      if (!isCandidate(slot)) continue;
      try {
        const smartHour = slot.smart ? await this.smartHour(row.user_id, row.timezone) : null;
        if (shouldSend(slot, smartHour)) dueUsers.push({ user_id: row.user_id });
      } catch (err) {
        this.logger.warn(
          `notification tick ${job.data.tickAt}: smart time failed for user ${row.user_id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (dueUsers.length === 0) {
      this.logger.debug(`notification tick ${job.data.tickAt}: no schedules due`);
      return;
    }

    const frontendUrl = this.config.get<string>('frontendUrl', 'http://localhost:3000');
    let notified = 0;

    for (const { user_id: userId } of dueUsers) {
      try {
        const payload = await this.buildPayload(userId);
        if (!payload) continue;

        const result = await this.pushDispatch.sendToUser(userId, payload, frontendUrl);
        if (result.sent > 0) notified += 1;
      } catch (err) {
        // One user's stats query or send failing should not stop the rest
        // of the tick — same per-item isolation as EnrichmentProcessor and
        // SrsService.sync.
        this.logger.warn(
          `notification tick ${job.data.tickAt}: failed for user ${userId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    this.logger.log(
      `notification tick ${job.data.tickAt}: ${dueUsers.length} schedule(s) due, ${notified} push(es) sent`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationCronJob> | undefined, err: Error): void {
    this.logger.error(`notification tick ${job?.data?.tickAt ?? '?'} failed: ${err.message}`);
  }

  /**
   * Smart time (A8c): the local hour in which each of today's words ripens,
   * read as the learner (RLS), then reminder-rules' pickSmartHour.
   */
  private async smartHour(userId: string, timezone: string): Promise<number | null> {
    const hours = await this.db.queryAs<{ hour: number }>(
      userId,
      `select extract(hour from uws.next_due_at at time zone $2)::int as hour
         from public.user_word_srs uws
        where uws.user_id = $1
          and uws.next_due_at >= (date_trunc('day', now() at time zone $2) at time zone $2)
          and uws.next_due_at <  (date_trunc('day', now() at time zone $2) at time zone $2) + interval '1 day'`,
      [userId, timezone],
    );
    return pickSmartHour(hours.map((h) => Number(h.hour)));
  }

  /**
   * FR-6.1/6.3/6.4's shared decision — see notification-message.ts.
   *
   * Delegates the due/leech/streak numbers to `computeSrsSummary` (see its
   * own comment in srs.service.ts), the same numbers GET /srs/stats shows.
   * Every read runs RLS-scoped as the learner (`queryAs`), exactly like
   * that endpoint: the bare `authenticator` role `query()` uses has no
   * table grants, so the old unscoped path could never have worked.
   */
  private async buildPayload(userId: string) {
    const queryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      params: unknown[],
    ) => this.db.queryAs<T>(userId, text, params);
    // No `detectedTz` here -- a cron tick has no request/browser to detect
    // one from, so this only ever resolves profiles.timezone (once a user
    // has actually set it) or DEFAULT_TIMEZONE.
    const timezone = await resolveUserTimezone(queryFn, userId);
    const summary = await computeSrsSummary(queryFn, userId, timezone);
    const [learner] = await queryFn<{ ui_locale: string | null; studied_today: boolean }>(
      `select p.ui_locale,
              exists (
                select 1 from public.review_logs r
                 where r.user_id = $1
                   and r.reviewed_at >= (date_trunc('day', now() at time zone $2) at time zone $2)
              ) as studied_today
         from public.profiles p
        where p.id = $1`,
      [userId, timezone],
    );

    return buildReminderPayload({
      dueNow: summary.due_now,
      leechCount: summary.leech_count,
      currentStreakDays: summary.current_streak_days,
      studiedToday: learner?.studied_today ?? false,
      locale: learner?.ui_locale,
    });
  }
}

function toSlot(row: ScheduleRow): ReminderSlot {
  return {
    nowMinute: Number(row.now_minute),
    savedMinute: Number(row.saved_minute),
    isoDow: Number(row.iso_dow),
    days: (row.days ?? []).map(Number),
    channels: row.channels ?? [],
    smart: row.smart === true,
  };
}
