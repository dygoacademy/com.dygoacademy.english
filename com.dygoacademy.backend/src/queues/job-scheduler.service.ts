import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';

import {
  MAINTENANCE_QUEUE,
  NOTIFICATION_QUEUE,
  NOTIFICATION_TICK_JOB,
  NOTIFICATION_TICK_SCHEDULER,
  PARTITION_MAINTENANCE_JOB,
  PARTITION_MAINTENANCE_SCHEDULER,
} from './queue.constants';

/**
 * Registers the repeating jobs — the producers.
 *
 * WHY THIS EXISTS: a BullMQ processor is only a consumer. Registering
 * `NotificationProcessor` makes the app able to handle a job; it does not make
 * one appear. Without a producer the notification queue simply never ticks,
 * and nothing anywhere reports an error — the failure is silence. This is the
 * piece that turns the architecture's "15-minute cron heartbeat" from a diagram
 * into something that actually runs.
 *
 * `upsertJobScheduler` is keyed on a stable scheduler id, so restarting the app
 * — or running several instances — updates one schedule rather than stacking up
 * duplicates. Changing a cron pattern below takes effect on next boot.
 */
@Injectable()
export class JobSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notifications: Queue,
    @InjectQueue(MAINTENANCE_QUEUE) private readonly maintenance: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // FR-6.1 — every 15 minutes, match users whose local reminder time has
    // arrived. Runs on UTC quarter-hours; the timezone match happens in the
    // processor against each user's IANA zone, so DST is handled by the
    // database rather than by the schedule.
    await this.notifications.upsertJobScheduler(
      NOTIFICATION_TICK_SCHEDULER,
      { pattern: '*/15 * * * *' },
      { name: NOTIFICATION_TICK_JOB, opts: { removeOnComplete: { count: 96 } } },
    );

    // Daily at 03:15 UTC — deliberately off the hour, so it does not contend
    // with every other cron on the box at :00.
    await this.maintenance.upsertJobScheduler(
      PARTITION_MAINTENANCE_SCHEDULER,
      { pattern: '15 3 * * *' },
      {
        name: PARTITION_MAINTENANCE_JOB,
        data: { monthsAhead: 6 },
        opts: { removeOnComplete: { count: 14 } },
      },
    );

    // Provision immediately as well as on the daily schedule: a deploy on the
    // 31st should not wait until 03:15 tomorrow to create next month's
    // partition, by which time inserts may already be failing.
    await this.maintenance.add(
      PARTITION_MAINTENANCE_JOB,
      { monthsAhead: 6 },
      { jobId: `bootstrap-${new Date().toISOString().slice(0, 10)}` },
    );

    const scheduled = [
      ...(await this.notifications.getJobSchedulers()),
      ...(await this.maintenance.getJobSchedulers()),
    ];
    this.logger.log(
      `repeating jobs registered: ${scheduled
        .map((s) => `${s.key} (${s.pattern})`)
        .join(', ')}`,
    );
  }
}
