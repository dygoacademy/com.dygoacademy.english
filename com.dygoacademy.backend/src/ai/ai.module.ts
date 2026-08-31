import { Global, Module } from '@nestjs/common';

import { GeminiEnrichmentService } from './gemini-enrichment.service';

@Global()
@Module({
  providers: [GeminiEnrichmentService],
  exports: [GeminiEnrichmentService],
})
export class AiModule {}
