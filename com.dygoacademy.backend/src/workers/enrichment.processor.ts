import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { DatabaseService } from '../database/database.service';
import { ENRICHMENT_QUEUE, WordEnrichmentJob } from '../queues/queue.constants';

/**
 * Gemini + TTS enrichment pipeline (Phase 1, Module 2).
 *
 * Phase 0 scaffold: the queue wiring and the master_lexicon cache lookup that
 * delivers the >85% hit-rate KPI are stubbed but structured. The Gemini and
 * TTS calls land in Phase 1.
 */
@Processor(ENRICHMENT_QUEUE)
export class EnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(EnrichmentProcessor.name);

  constructor(private readonly db: DatabaseService) {
    super();
  }

  async process(job: Job<WordEnrichmentJob>): Promise<void> {
    const { topicWordId, word, languageCode } = job.data;
    this.logger.log(`enriching "${word}" (${languageCode}) for ${topicWordId}`);

    // Step 1 — global lexical deduplication (FR-2.2). Checked BEFORE any paid
    // API call; this is what cuts AI cost by ~90%.
    const [cached] = await this.db.query<{ id: string }>(
      `select id from public.master_lexicon
        where normalized_word = lower(trim($1)) and language_code = $2`,
      [word, languageCode],
    );

    if (cached) {
      await this.db.query(
        `update public.topic_words
            set lexicon_id = $1, status = 'READY', updated_at = now()
          where id = $2`,
        [cached.id, topicWordId],
      );
      this.logger.log(`cache hit for "${word}" — no AI call made`);
      return;
    }

    // TODO(Phase 1): call Gemini 1.5 Flash, synthesise TTS, upload to R2,
    // insert into master_lexicon, then mark the topic_word READY.
    this.logger.warn(`cache miss for "${word}" — enrichment not implemented yet`);
  }
}
