import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSpeakingAttemptDto } from './dto/create-attempt.dto';
import { SpeakingService } from './speaking.service';
import { SpeakingAttempt, SpeakingSession } from './speaking.types';

@ApiBearerAuth()
@ApiTags('speaking')
@Controller({ path: 'speaking', version: '1' })
export class SpeakingController {
  constructor(private readonly speaking: SpeakingService) {}

  @Get('topics/:topicId/session')
  @ApiOperation({
    summary: 'A speaking session for one topic bed (Phase 13)',
    description:
      'Up to 5 sentences, due and new words first, with native UK/US audio URLs and word ' +
      'timings. item_count = all speaking items in the bed (the Speak button needs >= 5). ' +
      '404 when the caller cannot read the topic.',
  })
  async session(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ): Promise<SpeakingSession> {
    return this.speaking.session(userId, topicId);
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
