import { Global, Module } from '@nestjs/common';

import { GeminiEnrichmentService } from './gemini-enrichment.service';
import { GoogleWordTtsService } from './google-word-tts.service';
import { PronDataService } from './pron-data.service';
import { UsageCapService } from './usage-cap.service';

@Global()
@Module({
  providers: [GeminiEnrichmentService, GoogleWordTtsService, UsageCapService, PronDataService],
  exports: [GeminiEnrichmentService, GoogleWordTtsService, UsageCapService, PronDataService],
})
export class AiModule {}
