import { Global, Module } from '@nestjs/common';

import { GeminiEnrichmentService } from './gemini-enrichment.service';
import { UsageCapService } from './usage-cap.service';

@Global()
@Module({
  providers: [GeminiEnrichmentService, UsageCapService],
  exports: [GeminiEnrichmentService, UsageCapService],
})
export class AiModule {}
