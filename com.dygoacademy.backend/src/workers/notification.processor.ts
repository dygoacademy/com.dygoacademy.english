import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { NOTIFICATION_QUEUE, NotificationCronJob } from '../queues/queue.constants';

/**
 * Timezone-aware push dispatcher (Phase 3, Module 6).
 *
 * Runs on a 15-minute heartbeat and matches each user's configured local
 * reminder time. Timezones are stored as IANA strings so DST is handled by the
 * database rather than by a stored UTC offset that silently drifts twice a year.
 */
@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationCronJob>): Promise<void> {
    this.logger.debug(`notification tick ${job.data.tickAt}`);
    // TODO(Phase 3): select due study_schedules for this tick and dispatch
    // VAPID push via web-push.
  }
}
