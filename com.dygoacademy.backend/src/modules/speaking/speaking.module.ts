import { Module } from '@nestjs/common';

import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';

/**
 * Phase 13: adult speaking sessions (session + attempts). Native audio is
 * made offline by `scripts/speaking-generate.ts`. StorageService needs no
 * import here (StorageModule is @Global()).
 */
@Module({
  controllers: [SpeakingController],
  providers: [SpeakingService],
})
export class SpeakingModule {}
