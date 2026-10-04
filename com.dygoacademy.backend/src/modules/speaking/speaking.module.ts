import { Module } from '@nestjs/common';

import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';
import { SpeechCheckRateLimitGuard } from './speech-check-rate-limit.guard';
import { SpeechCheckService } from './speech-check.service';
import { MacSpeechChecker, SPEECH_CHECKER } from './speech-checker';

/**
 * Phase 13: adult speaking sessions (session + attempts) and speech checks
 * (`POST /speaking/check` → the speech scorer, S17 / G6). Native audio is
 * made offline by `scripts/speaking-generate.ts`. StorageService needs no
 * import here (StorageModule is @Global()).
 */
@Module({
  controllers: [SpeakingController],
  providers: [
    SpeakingService,
    SpeechCheckService,
    SpeechCheckRateLimitGuard,
    // G6: the self-hosted scorer on this Mac; swap the class to change service.
    { provide: SPEECH_CHECKER, useClass: MacSpeechChecker },
  ],
})
export class SpeakingModule {}
