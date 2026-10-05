import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { toCheckResult } from './speech-check.mapper';
import { SPEECH_CHECKER, SpeechAudio, SpeechCheckError, SpeechChecker } from './speech-checker';
import { SPEAKING_CHECK_MAX_BYTES, SpeakingCheckResult } from './speaking.types';

/** What browsers record: AAC (iPhone Safari), WebM/Opus (Chrome), WAV (the PCM fallback). */
const AUDIO_TYPES = /^audio\/(mp4|x-m4a|aac|webm|ogg|wav|x-wav|wave)\b/;

/**
 * Phase 13 S17: checks a learner's recording against a speaking item's
 * sentence with the speech scorer (G6: self-hosted on the Mac). The
 * recording stays in memory: never written to disk, the database or logs
 * (handover v2 D2: send → check → delete).
 */
@Injectable()
export class SpeechCheckService {
  constructor(
    private readonly db: DatabaseService,
    @Inject(SPEECH_CHECKER) private readonly checker: SpeechChecker,
  ) {}

  async check(
    userId: string,
    itemId: string,
    audio: SpeechAudio | undefined,
  ): Promise<SpeakingCheckResult> {
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
    const sentence = rows[0]?.sentence;
    if (!sentence) throw new NotFoundException('Speaking item not found');

    try {
      const raw = await this.checker.check(audio, sentence, rows[0].target_index);
      return toCheckResult(raw, sentence.trim().split(/\s+/).length);
    } catch (err) {
      if (err instanceof SpeechCheckError) {
        if (err.kind === 'bad_audio') throw new UnprocessableEntityException(err.message);
        // Timeout or scorer down: SP3 shows "Couldn't check this one".
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }
}
