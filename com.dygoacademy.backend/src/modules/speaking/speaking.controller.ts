import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSpeakingAttemptDto } from './dto/create-attempt.dto';
import { SpeakingService } from './speaking.service';
import {
  SpeakingAttempt,
  SpeakingSession,
  SpeakingWordItem,
  SpeakingWordLookup,
} from './speaking.types';

@ApiBearerAuth()
@ApiTags('speaking')
@Controller({ path: 'speaking', version: '1' })
export class SpeakingController {
  constructor(private readonly speaking: SpeakingService) {}

  @Get('session')
  @ApiOperation({
    summary: 'A speaking session for The Pond (Phase 13)',
    description:
      "Up to 5 of the learner's words that have a speaking item: due first, then new, then " +
      'the rest. Native UK/US audio URLs and word timings. item_count = how many of their ' +
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

  @Post('attempts')
  @ApiOperation({
    summary: 'Save one speaking Compare result (Phase 13)',
    description:
      "Score, garden stage and per-word marks from the on-device scorer. The learner's " +
      'recording is never uploaded (D2). Try again = another row. 404 for an unknown item_id.',
  })
  async createAttempt(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSpeakingAttemptDto,
  ): Promise<SpeakingAttempt> {
    return this.speaking.createAttempt(userId, dto);
  }
}
