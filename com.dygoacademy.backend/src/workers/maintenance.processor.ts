import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { PartitionService } from '../database/partition.service';
import { VoiceDonationService } from '../modules/voice-donation/voice-donation.service';
import {
  MAINTENANCE_QUEUE,
  PartitionMaintenanceJob,
  VOICE_DONATION_CLEANUP_JOB,
} from '../queues/queue.constants';

/**
 * Keeps review_logs partitions ahead of the calendar (see PartitionService),
 * and runs the voice donation cleanup (`voice-donation-cleanup`).
 */
@Processor(MAINTENANCE_QUEUE)
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(
    private readonly partitions: PartitionService,
    private readonly donations: VoiceDonationService,
  ) {
    super();
  }

  async process(job: Job<PartitionMaintenanceJob>): Promise<void> {
    if (job.name === VOICE_DONATION_CLEANUP_JOB) {
      await this.donations.cleanup();
      return;
    }
    const created = await this.partitions.ensureReviewLogPartitions(job.data?.monthsAhead ?? 6);

    // Rows here mean provisioning fell behind at some point. Surfaced loudly
    // because relocating them later needs an exclusive lock on review_logs.
    const stranded = await this.partitions.countDefaultPartitionRows();
    if (stranded > 0) {
      this.logger.warn(
        `${stranded} row(s) sitting in review_logs_default — partition ` +
          `provisioning fell behind and these need relocating`,
      );
    }

    if (created.length === 0 && stranded === 0) {
      this.logger.debug('partition maintenance: nothing to do');
    }
  }
}
