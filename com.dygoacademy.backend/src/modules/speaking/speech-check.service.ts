import { randomUUID } from 'node:crypto';

import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { DatabaseService } from '../../database/database.service';
import { SPEECH_CHECK_JOB, SPEECH_CHECK_QUEUE, SpeechCheckJob } from '../../queues/queue.constants';
import { SpeechCheckStore } from './speech-check.store';
import type { SpeechAudio } from './speech-checker';
import {
  SPEAKING_CHECK_MAX_BYTES,
  SPEECH_CHECK_AVG_SECONDS,
  SpeakingCheckQueued,
  SpeakingCheckState,
} from './speaking.types';

/** What browsers record: AAC (iPhone Safari), WebM/Opus (Chrome), WAV (the PCM fallback). */
const AUDIO_TYPES = /^audio\/(mp4|x-m4a|aac|webm|ogg|wav|x-wav|wave)\b/;

/**
 * Phase 13 speech checks, queued (v1, 2026-10-06). `enqueue` validates the
 * upload, keeps the recording in this process's memory (SpeechCheckStore)
 * and queues a job with ids only, then answers at once (202); the
 * SpeechCheckProcessor sends it to a free scorer. `status` is polled by the
 * app during SP3's "Checking your sentence…". The recording is never
 * written to disk, Redis, the database or logs (D2: send → check → delete).
 * When the estimated wait passes `speech.busyEtaSeconds`, a new check is
 * refused with 503 and the app shows its own quick result instead.
 */
@Injectable()
export class SpeechCheckService {
  constructor(
    private readonly db: DatabaseService,
    private readonly store: SpeechCheckStore,
    private readonly config: ConfigService,
    @InjectQueue(SPEECH_CHECK_QUEUE) private readonly queue: Queue<SpeechCheckJob>,
  ) {}

  async enqueue(
    userId: string,
    itemId: string,
    audio: SpeechAudio | undefined,
  ): Promise<SpeakingCheckQueued> {
    if (!audio || audio.buffer.length === 0) throw new BadRequestException('audio is required');
    if (audio.buffer.length > SPEAKING_CHECK_MAX_BYTES) {
      throw new PayloadTooLargeException('The recording is over 1 MB');
    }
    if (!AUDIO_TYPES.test(audio.mimetype)) {
      throw new UnprocessableEntityException('Send the recording as m4a, webm or wav');
    }

    const rows = await this.db.queryAs<{ sentence: string; target_index: number }>(
      userId,
      'select sentence, target_index from public.speaking_items where id = $1',
      [itemId],
    );
    const item = rows[0];
    if (!item?.sentence) throw new NotFoundException('Speaking item not found');

    // Busy: the wait for a new check, at SPEECH_CHECK_AVG_SECONDS per check
    // spread over the scorers, would pass the limit.
    const scorers = this.config.get<string[]>('speech.scorerUrls')?.length || 1;
    const ahead = (await this.queue.getWaitingCount()) + (await this.queue.getActiveCount());
    const etaSeconds = Math.ceil(((ahead + 1) / scorers) * SPEECH_CHECK_AVG_SECONDS);
    if (etaSeconds > (this.config.get<number>('speech.busyEtaSeconds') ?? 15)) {
      throw new ServiceUnavailableException('Speech checking is busy');
    }

    const checkId = randomUUID();
    this.store.add(checkId, userId, audio);
    await this.queue.add(
      SPEECH_CHECK_JOB,
      { checkId, userId, sentence: item.sentence, targetIndex: item.target_index },
      // One try: a retry can't help once the recording was handed out, and a
      // failure is shown at once ("Couldn't check", Check again).
      { jobId: checkId, attempts: 1, removeOnComplete: true, removeOnFail: true },
    );
    return { check_id: checkId, status: 'queued', position: ahead, eta_s: etaSeconds };
  }

  status(userId: string, checkId: string): SpeakingCheckState {
    const entry = this.store.get(checkId, userId);
    if (!entry) throw new NotFoundException('Speech check not found');
    return {
      check_id: checkId,
      status: entry.status,
      ...(entry.result ? { result: entry.result } : {}),
      ...(entry.reason ? { reason: entry.reason } : {}),
    };
  }
}
