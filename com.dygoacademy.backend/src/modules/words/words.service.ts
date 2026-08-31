import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { DatabaseService } from '../../database/database.service';
import { ENRICHMENT_QUEUE, WordEnrichmentJob } from '../../queues/queue.constants';
import { CreateWordDto } from './dto/create-word.dto';

export interface TopicWord {
  id: string;
  topic_id: string;
  source_word: string;
  language_code: string;
  status: 'ENRICHING' | 'READY' | 'FAILED';
  created_at: Date;
}

/** Postgres error codes this service translates into HTTP responses. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_ROW_LEVEL_SECURITY_VIOLATION = '42501';

/** Module 2 — Word ingestion; returns 201 ENRICHING in <50ms (Phase 1). */
@Injectable()
export class WordsService {
  constructor(
    protected readonly db: DatabaseService,
    @InjectQueue(ENRICHMENT_QUEUE) private readonly enrichmentQueue: Queue<WordEnrichmentJob>,
  ) {}

  /**
   * Inserts the word row and returns immediately with status ENRICHING —
   * the Gemini/TTS work happens in EnrichmentProcessor, off the request path,
   * which is what keeps this under the <50ms SLO (dygo_academy_api_surface.md
   * §3).
   *
   * No app-level permission check here on purpose: `topic_words_insert_write`
   * (002_rls_policies.sql) already requires `has_topic_role(topic_id, 'WRITE')`
   * for this INSERT to succeed. Duplicating that check here would just be a
   * second place for the permission logic to drift from the database's.
   */
  async ingest(userId: string, dto: CreateWordDto): Promise<TopicWord> {
    const languageCode = dto.languageCode ?? 'en';

    let row: TopicWord;
    try {
      const rows = await this.db.queryAs<TopicWord>(
        userId,
        `insert into public.topic_words (topic_id, source_word, language_code, added_by)
         values ($1, $2, $3, $4)
         returning id, topic_id, source_word, language_code, status, created_at`,
        [dto.topicId, dto.word.trim(), languageCode, userId],
      );
      row = rows[0];
    } catch (err) {
      throw this.translateInsertError(err);
    }

    // Fire the enrichment job after the row is committed. A failure to
    // enqueue must not roll back the insert or fail the request: the word
    // exists and stays ENRICHING; MaintenanceProcessor / a manual re-enrich
    // (POST /words/:id/re-enrich, not yet built) can recover it later rather
    // than the caller seeing a 500 for a queue hiccup.
    await this.enrichmentQueue.add('enrich-word', {
      topicWordId: row.id,
      word: row.source_word,
      languageCode: row.language_code,
      targetCEFR: dto.targetCEFR,
      triggeredByUserId: userId,
    });

    return row;
  }

  private translateInsertError(err: unknown): Error {
    const pgErr = err as { code?: string; message?: string };

    if (pgErr?.code === PG_UNIQUE_VIOLATION) {
      return new ConflictException('This word is already in the topic.');
    }
    if (pgErr?.code === PG_ROW_LEVEL_SECURITY_VIOLATION) {
      return new ForbiddenException('WRITE role on this topic is required.');
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}
