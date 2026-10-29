import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-node';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CheckSpeechDto } from './dto/check-speech.dto';
import { CreateSpeakingAttemptDto } from './dto/create-attempt.dto';
import { WordCheckDto } from './dto/word-check.dto';
import { SpeechCheckRateLimitGuard } from './speech-check-rate-limit.guard';
import { SpeechCheckService } from './speech-check.service';
import { SpeakingService } from './speaking.service';
import { deviceFromUserAgent } from '../voice-donation/voice-donation.types';
import {
  SPEAKING_CHECK_MAX_BYTES,
  SpeakingAttempt,
  SpeakingCheckQueued,
  SpeakingCheckState,
  SpeakingHarvestWord,
  SpeakingSession,
  SpeakingWordItem,
  SpeakingWordLookup,
} from './speaking.types';

/** The fields of multer's in-memory file that `POST /speaking/check-speech` reads. */
interface UploadedAudio {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@ApiBearerAuth()
@ApiTags('speaking')
@Controller({ path: 'speaking', version: '1' })
export class SpeakingController {
  constructor(
    private readonly speaking: SpeakingService,
    private readonly speechCheck: SpeechCheckService,
  ) {}

  @Get('session')
  @ApiOperation({
    summary: 'A speaking session for The Pond (Phase 13)',
    description:
      "Up to 5 of the learner's own words (planted, or from their first bed) that have a " +
      'speaking item: due first, then the most recently planted, then new. Native UK/US audio URLs and word timings. item_count = how many of their ' +
      'words have an item. topic_id narrows it to one bed.',
  })
  @ApiQuery({ name: 'topic_id', required: false })
  async session(
    @CurrentUser('id') userId: string,
    @Query('topic_id') topicId?: string,
  ): Promise<SpeakingSession> {
    return this.speaking.session(userId, topicId || undefined);
  }

  @Get('words')
  @ApiOperation({
    summary: 'Which review cards can offer "Say this one?" (Phase 13, T9-a)',
    description:
      'topic_word_ids = comma-separated topic_words ids (up to 50). Returns one row per id ' +
      'that has a speaking item: its item_id and whether the learner spoke it today (their ' +
      'local day: profile timezone, else tz). Ids without an item, unreadable or malformed ' +
      'are left out.',
  })
  @ApiQuery({ name: 'topic_word_ids', required: true })
  @ApiQuery({ name: 'tz', required: false })
  async lookupWords(
    @CurrentUser('id') userId: string,
    @Query('topic_word_ids') topicWordIds?: string,
    @Query('tz') tz?: string,
  ): Promise<SpeakingWordLookup[]> {
    const ids = (topicWordIds ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.speaking.lookupWords(userId, ids, tz);
  }

  @Get('words/:topicWordId')
  @ApiOperation({
    summary: 'The speaking item for one flashcard word (Phase 13, "Say this one?")',
    description: '404 when the caller cannot read the word or it has no speaking item yet.',
  })
  async forWord(
    @CurrentUser('id') userId: string,
    @Param('topicWordId') topicWordId: string,
  ): Promise<SpeakingWordItem> {
    return this.speaking.forWord(userId, topicWordId);
  }

  @Get('harvest')
  @ApiOperation({
    summary: '"Ready to harvest" on a topic bed (Phase 13 SE5)',
    description:
      "The bed's words that have a speaking item, with harvested_score / harvested_at when the " +
      'learner pollinated the word (80%+), and its syllables for the bee row. Visual only: ' +
      'it never changes SRS. 404 for a malformed topic_id.',
  })
  @ApiQuery({ name: 'topic_id', required: true })
  async harvest(
    @CurrentUser('id') userId: string,
    @Query('topic_id') topicId?: string,
  ): Promise<SpeakingHarvestWord[]> {
    return this.speaking.harvest(userId, topicId ?? '');
  }

  @Post('attempts')
  @ApiOperation({
    summary: 'Save one speaking Compare result (Phase 13)',
    description:
      "Score, garden stage and per-word marks from the on-device scorer. The learner's " +
      'recording is never uploaded (D2). Try again = another row. 404 for an unknown item_id. ' +
      "The first attempt on a sentence in the learner's day counts toward the SPEAK mission " +
      '(SE1); with harvest: true and a score of 80+, the word is pollinated (no SRS change).',
  })
  async createAttempt(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSpeakingAttemptDto,
  ): Promise<SpeakingAttempt> {
    return this.speaking.createAttempt(userId, dto);
  }

  // `check` is the name before 2026-10-11: kept so apps loaded before the rename keep working.
  @Post(['check-speech', 'check'])
  @HttpCode(202)
  @UseGuards(SpeechCheckRateLimitGuard)
  @UseInterceptors(
    // No `dest` / `storage`: multer keeps the file in memory (`buffer`), never on disk.
    FileInterceptor('audio', { limits: { fileSize: SPEAKING_CHECK_MAX_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio', 'item_id', 'accent'],
      properties: {
        audio: { type: 'string', format: 'binary', description: 'm4a / webm / wav, ≤ 1 MB' },
        item_id: { type: 'string', format: 'uuid' },
        accent: { type: 'string', enum: ['UK', 'US'] },
      },
    },
  })
  @ApiOperation({
    summary: "Queue a check of a learner's recording against the item's sentence (Phase 13)",
    description:
      'Answers at once (202) with a check_id, the checks ahead (position) and a rough wait ' +
      '(eta_s); poll GET /speaking/check/:id for the result. The speech scorer on the server ' +
      '(G6, self-hosted) marks each word missing / unclear (with what it heard) / fine and ' +
      'gives a 0–100 score and garden stage. The recording is held in memory only: never ' +
      'stored, queued in Redis or logged. Not saved as an attempt. 413 over 1 MB, 422 not ' +
      'm4a / webm / wav, 404 unknown item_id, 429 over 60 checks an hour, 503 busy (the wait ' +
      'would pass SPEECH_BUSY_ETA_SECONDS): the app then shows its own quick result.',
  })
  async check(
    @CurrentUser('id') userId: string,
    @Body() dto: CheckSpeechDto,
    @UploadedFile() audio?: UploadedAudio,
    @Headers('user-agent') userAgent?: string,
  ): Promise<SpeakingCheckQueued> {
    return this.speechCheck.enqueue(
      userId,
      dto.item_id,
      audio && {
        buffer: audio.buffer,
        mimetype: audio.mimetype,
        filename: audio.originalname || 'recording',
      },
      { accent: dto.accent, device: deviceFromUserAgent(userAgent) },
    );
  }

  // `word-check` is the name before 2026-10-11 (see `check` above).
  @Post(['check-pronunciation', 'word-check'])
  @HttpCode(202)
  @UseGuards(SpeechCheckRateLimitGuard)
  @UseInterceptors(
    // In memory only, as for POST /speaking/check-speech.
    FileInterceptor('audio', { limits: { fileSize: SPEAKING_CHECK_MAX_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio', 'topic_word_id', 'accent'],
      properties: {
        audio: { type: 'string', format: 'binary', description: 'm4a / webm / wav, ≤ 1 MB' },
        topic_word_id: { type: 'string', format: 'uuid' },
        accent: { type: 'string', enum: ['UK', 'US'] },
      },
    },
  })
  @ApiOperation({
    summary: 'Queue a check of one word the learner said (Pronunciation, 2026-10-11)',
    description:
      'Same queue, limits and polling as POST /speaking/check-speech (poll GET /speaking/check/:id). ' +
      'The scorer checks the word against its IPA for the accent: a score per syllable, which ' +
      'ones wobbled (and what they sounded like), not_heard / other_word. passed = ok with every syllable 80+; ' +
      'a passed word is pollinated (speaking_harvests, once per word; never SRS). The ' +
      'recording is never stored. 404 when the learner cannot read the word.',
  })
  async wordCheck(
    @CurrentUser('id') userId: string,
    @Body() dto: WordCheckDto,
    @UploadedFile() audio?: UploadedAudio,
    @Headers('user-agent') userAgent?: string,
  ): Promise<SpeakingCheckQueued> {
    return this.speechCheck.enqueueWord(
      userId,
      dto.topic_word_id,
      dto.accent,
      audio && {
        buffer: audio.buffer,
        mimetype: audio.mimetype,
        filename: audio.originalname || 'recording',
      },
      { device: deviceFromUserAgent(userAgent) },
    );
  }

  @Get('check/:checkId')
  @ApiOperation({
    summary: 'A queued speech check: queued / checking / done (with the result) / failed',
    description:
      'Polled by the app while SP3 shows "Checking your sentence…". Only the learner who ' +
      'sent the recording can read it; 404 for anyone else, an unknown id, or after 10 ' +
      'minutes. failed carries a reason: bad_audio, timeout, unavailable or expired.',
  })
  checkStatus(
    @CurrentUser('id') userId: string,
    @Param('checkId', new ParseUUIDPipe()) checkId: string,
  ): SpeakingCheckState {
    return this.speechCheck.status(userId, checkId);
  }
}
