import { Module } from '@nestjs/common';

import { VoiceDonationController } from './voice-donation.controller';
import { VoiceDonationService } from './voice-donation.service';
import { VoiceDonationStorage } from './voice-donation.storage';

/**
 * Voice donation (`Voice donation consent plan.md`): the A8e setting, the
 * encrypted copy of donated recordings (called by the speech-check worker)
 * and the cleanup run by the maintenance queue.
 */
@Module({
  controllers: [VoiceDonationController],
  providers: [VoiceDonationService, VoiceDonationStorage],
  exports: [VoiceDonationService],
})
export class VoiceDonationModule {}
