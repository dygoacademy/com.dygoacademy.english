import { Module } from '@nestjs/common';

import { VoiceDonationModule } from '../voice-donation/voice-donation.module';
import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';
import { SpeechCheckProcessor } from './speech-check.processor';
import { SpeechCheckRateLimitGuard } from './speech-check-rate-limit.guard';
import { SpeechCheckStore } from './speech-check.store';
import { SpeechCheckService } from './speech-check.service';
import { MacSpeechChecker, SPEECH_CHECKER } from './speech-checker';

/**
 * Phase 13: adult speaking sessions (session + attempts) and speech checks
 * (`POST /speaking/check-speech` → the speech scorer, S17 / G6). Native audio is
 * made offline by `scripts/speaking-generate.ts`. StorageService needs no
 * import here (StorageModule is @Global()).
 */
@Module({
  // Voice donation: the worker keeps a donated copy before dropping a recording.
  imports: [VoiceDonationModule],
  controllers: [SpeakingController],
  providers: [
    SpeakingService,
    SpeechCheckService,
    SpeechCheckStore,
    // Queue v1 (2026-10-06): runs queued checks on the scorers in SPEECH_SCORER_URLS.
    SpeechCheckProcessor,
    SpeechCheckRateLimitGuard,
    // G6: the self-hosted scorer on this Mac; swap the class to change service.
    { provide: SPEECH_CHECKER, useClass: MacSpeechChecker },
  ],
})
export class SpeakingModule {}
