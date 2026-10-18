import { Global, Module } from '@nestjs/common';

import { GeminiEnrichmentService } from './gemini-enrichment.service';
import { GoogleWordTtsService } from './google-word-tts.service';
import { UsageCapService } from './usage-cap.service';

@Global()
@Module({
  providers: [GeminiEnrichmentService, GoogleWordTtsService, UsageCapService],
  exports: [GeminiEnrichmentService, GoogleWordTtsService, UsageCapService],
})
export class AiModule {}
