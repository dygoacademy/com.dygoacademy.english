import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

import { DatabaseService } from '../database/database.service';
import { buildReminderPayload } from '../modules/notifications/notification-message';
import { PushDispatchService } from '../modules/notifications/push-dispatch.service';
import { computeSrsSummary } from '../modules/srs/srs.service';
import { NOTIFICATION_QUEUE, NotificationCronJob } from '../queues/queue.constants';

interface DueScheduleRow {
  user_id: string;
}

/**
 * Timezone-aware push dispatcher (Phase 3, Module 6).
 *
 * Runs on a 15-minute heartbeat and matches each user's configured local
 * reminder time. Timezones are stored as IANA strings so DST is handled by
 * the database rather than by a stored UTC offset that silently drifts
 * twice a year.
 *
 * BUCKET MATCHING: a UTC quarter-hour tick does not land on every user's
 * local reminder minute exactly — a timezone like `Asia/Kathmandu`
 * (UTC+5:45) shifts the alignment by 45 minutes, not a clean multiple of 15.
 * `width_bucket` over `[0, 86400)` seconds-of-day with 96 buckets partitions
 * each user's *own* local day into fixed 900-second (15-minute) windows
 * anchored to their own local midnight; comparing "now"'s bucket to
 * `reminder_time`'s bucket catches exactly one tick per reminder regardless
 * of the zone's offset, including half- and quarter-hour offsets, without
 * needing the tick schedule itself to know about every zone in use.
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
    const dueUsers = await this.db.query<DueScheduleRow>(
      `select distinct s.user_id
         from public.study_schedules s
        where s.is_enabled
          and width_bucket(
                extract(epoch from ((now() at time zone s.timezone))::time), 0, 86400, 96
              )
              =
              width_bucket(extract(epoch from s.reminder_time), 0, 86400, 96)`,
    );

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

  /**
   * FR-6.1/6.3/6.4's shared decision — see notification-message.ts.
   *
   * Delegates the due/leech/streak numbers to `computeSrsSummary` (see its
   * own comment in srs.service.ts) instead of this method's own
   * hand-maintained copy of the query — this file is exactly the second
   * caller that comment describes. Runs unscoped (`this.db.query`, the
   * bare `authenticator` role) rather than `queryAs`, since a BullMQ cron
   * tick has no per-request JWT to scope by and iterates many users per
   * tick; `computeSrsSummary`'s explicit `where user_id = $1` is what keeps
   * this safe on that path.
   */
  private async buildPayload(userId: string) {
    const summary = await computeSrsSummary((text, params) => this.db.query(text, params), userId);

    return buildReminderPayload({
      dueNow: summary.due_now,
      leechCount: summary.leech_count,
      currentStreakDays: summary.current_streak_days,
    });
  }
}
