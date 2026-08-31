import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateWordDto } from './dto/rate-word.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { SyncReviewsDto } from './dto/sync-reviews.dto';
import {
  DueCard,
  LeechCard,
  RateWordResult,
  SessionResult,
  SrsService,
  SrsStats,
  SyncItemResult,
} from './srs.service';

@ApiBearerAuth()
@ApiTags('srs')
@Controller({ path: 'srs', version: '1' })
export class SrsController {
  constructor(private readonly srsService: SrsService) {}

  @Get('due')
  @ApiOperation({
    summary: 'All due cards (FR-3.4)',
    description:
      'Cards past next_due_at, plus never-reviewed READY words. Not scoped ' +
      "to one topic — see /topics/:topicId/cards/due for that. Carries FR-3.4's " +
      'p95 < 15ms budget on the "existing due" half of the query.',
  })
  async due(@CurrentUser('id') userId: string, @Query('limit') limit?: string): Promise<DueCard[]> {
    return this.srsService.findDue(userId, undefined, limit ? Number(limit) : undefined);
  }

  @Get('leeches')
  @ApiOperation({
    summary: 'Leech words (FR-3.3)',
    description: 'Words with >= 4 failures in the trailing 7 days.',
  })
  async leeches(@CurrentUser('id') userId: string): Promise<LeechCard[]> {
    return this.srsService.findLeeches(userId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Personal study stats (FR-8.1)',
    description: 'Streak, mastery count, due count, and leech count.',
  })
  async stats(@CurrentUser('id') userId: string): Promise<SrsStats> {
    return this.srsService.stats(userId);
  }

  @Post('rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a review rating (FR-3.2)',
    description:
      'One of AGAIN/HARD/GOOD/EASY. Updates ease factor, interval, and ' +
      'leech status per the FR-3.1 formula — see srs-algorithm.ts for the math.',
  })
  async rate(@CurrentUser('id') userId: string, @Body() dto: RateWordDto): Promise<RateWordResult> {
    return this.srsService.rate(userId, dto);
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a study session (FR-4.3)',
    description:
      'Standard, Reverse, or Listening mode. See StartSessionDto for why ' +
      'this does not persist a session row.',
  })
  async startSession(
    @CurrentUser('id') userId: string,
    @Body() dto: StartSessionDto,
  ): Promise<SessionResult> {
    return this.srsService.startSession(userId, dto);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Replay offline review logs',
    description:
      'Applies a batch of client-queued reviews in chronological order. ' +
      'Per-item failures are reported individually, not as a batch failure.',
  })
  async sync(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncReviewsDto,
  ): Promise<SyncItemResult[]> {
    return this.srsService.sync(userId, dto);
  }
}
