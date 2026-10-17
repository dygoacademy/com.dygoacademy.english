import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

import { DatabaseService } from '../../database/database.service';
import { settleWeek } from '../missions/weekly.store';
import { resolveUserTimezone } from '../srs/srs.service';
import { SPEECH_CHECK_QUEUE, SpeechCheckJob } from '../../queues/queue.constants';
import { toCheckResult, toWordCheckResult } from './speech-check.mapper';
import { ScorerPool, SpeechCheckStore } from './speech-check.store';
import { SPEECH_CHECKER, SpeechCheckError, SpeechChecker } from './speech-checker';
import { VoiceDonationService } from '../voice-donation/voice-donation.service';

/**
 * Queue v1 (2026-10-06): runs queued speech checks. Takes the recording
 * from memory (once), sends it to a free scorer from SPEECH_SCORER_URLS and
 * records the result or why it failed in SpeechCheckStore, where the app
 * polls it. Concurrency = number of scorers (each does one check at a
 * time). A word check that passes pollinates the word (`speaking_harvests`,
 * once per word, as the learner; never SRS). Voice donation: when the
 * learner's consent is active, an encrypted copy of a scored recording is
 * kept after the result is out (VoiceDonationService.keep, never throws);
 * otherwise the recording is dropped as before. Never throws, so BullMQ doesn't retry: the app shows a failure at
 * once and the learner can Check again or Record again.
 */
@Processor(SPEECH_CHECK_QUEUE)
export class SpeechCheckProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SpeechCheckProcessor.name);
  private readonly pool: ScorerPool;

  constructor(
    private readonly store: SpeechCheckStore,
    @Inject(SPEECH_CHECKER) private readonly checker: SpeechChecker,
    config: ConfigService,
    private readonly db: DatabaseService,
    private readonly donations: VoiceDonationService,
  ) {
    super();
    this.pool = new ScorerPool(config.get<string[]>('speech.scorerUrls') ?? []);
  }

  onModuleInit(): void {
    this.worker.concurrency = this.pool.size;
  }

  async process(job: Job<SpeechCheckJob>): Promise<void> {
    const { checkId } = job.data;
    const audio = this.store.takeAudio(checkId);
    if (!audio) {
      this.store.failed(checkId, 'expired');
      return;
    }
    const scorer = this.pool.acquire();
    const started = Date.now();
    try {
      const data = job.data;
      if (data.kind === 'word') {
        const raw = await this.checker.checkWord(audio, data.word, data.ipa ?? '', scorer);
        const result = toWordCheckResult(raw, data.word, data.ipa);
        const pollinated =
          result.passed && (await this.pollinate(data.userId, data.lexiconId, result.total));
        this.store.done(checkId, { ...result, pollinated });
        void this.donations.keep(data.userId, audio, {
          kind: 'word',
          text: data.word,
          targetIpa: data.ipa,
          accent: data.accent ?? null,
          device: data.device ?? null,
          scores: raw,
        });
      } else {
        const raw = await this.checker.check(audio, data.sentence, data.targetIndex, scorer);
        this.store.done(checkId, toCheckResult(raw, data.sentence.trim().split(/\s+/).length));
        void this.donations.keep(data.userId, audio, {
          kind: 'sentence',
          text: data.sentence,
          targetIpa: null,
          accent: data.accent ?? null,
          device: data.device ?? null,
          scores: raw,
        });
      }
    } catch (err) {
      const reason = err instanceof SpeechCheckError ? err.kind : 'unavailable';
      if (!(err instanceof SpeechCheckError))
        this.logger.warn(`speech check error: ${String(err)}`);
      this.store.failed(checkId, reason);
    } finally {
      this.pool.release(scorer);
      // Timings only: never the audio, the sentence or the result.
      this.logger.log(`speech check ${Date.now() - started} ms on ${scorer}`);
    }
  }

  /**
   * Saves the word as pollinated (D-3: 80 %+, visual only). True when it
   * wasn't already. A failed save still shows the result; the bee just
   * stays on the bed.
   */
  private async pollinate(userId: string, lexiconId: string, score: number): Promise<boolean> {
    try {
      const rows = await this.db.queryAs<{ id: string }>(
        userId,
        `insert into public.speaking_harvests (lexicon_id, score)
         values ($1, $2)
         on conflict (user_id, lexicon_id) do nothing
         returning id`,
        [lexiconId, score],
      );
      if (rows.length > 0) await this.settleWeek(userId);
      return rows.length > 0;
    } catch (err) {
      this.logger.warn(`pollinate failed: ${String(err)}`);
      return false;
    }
  }

  /**
   * A4: a pollinated word with the week's sound counts toward "Sound of the
   * week" and may finish the week (+1 rain barrel). Never fails the check.
   */
  private async settleWeek(userId: string): Promise<void> {
    try {
      await this.db.withUser(userId, async (client) => {
        const timezone = await resolveUserTimezone(
          async <T extends Record<string, unknown>>(text: string, params: unknown[]) =>
            (await client.query<T>(text, params)).rows,
          userId,
        );
        await settleWeek(client, userId, timezone, new Date());
      });
    } catch (err) {
      this.logger.warn(`weekly missions: ${String(err)}`);
    }
  }
}
