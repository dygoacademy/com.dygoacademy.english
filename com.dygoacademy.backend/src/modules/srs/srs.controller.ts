import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateWordDto } from './dto/rate-word.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { SyncReviewsDto } from './dto/sync-reviews.dto';
import {
  DailyActivity,
  DueCard,
  LeechCard,
  RateWordResult,
  SessionResult,
  SrsService,
  SrsStats,
  SyncItemResult,
  TierProgress,
  UpcomingActivity,
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
    description:
      'Streak, mastery count, due count, and leech count. `tz` (an IANA ' +
      "zone, e.g. from the caller's Intl.DateTimeFormat().resolvedOptions()) " +
      'is used only when profiles.timezone has never been set — see ' +
      'SrsService.resolveUserTimezone.',
  })
  async stats(@CurrentUser('id') userId: string, @Query('tz') tz?: string): Promise<SrsStats> {
    return this.srsService.stats(userId, tz);
  }

  @Get('tier-progress')
  @ApiOperation({
    summary: 'Vocabulary mastery tier progress (Phase 9)',
    description:
      'Replaces an invented decimal "estimated band" with a checkable ' +
      'claim: how many words the caller has mastered in their current ' +
      "tier's collection, and how many remain before the next tier. " +
      'Home and Analytics both read this route so they cannot disagree.',
  })
  async tierProgress(@CurrentUser('id') userId: string): Promise<TierProgress> {
    return this.srsService.getTierProgress(userId);
  }

  @Get('activity')
  @ApiOperation({
    summary: 'Daily review activity (Phase 3 Module 18, FR-18.1)',
    description:
      "Per-day review counts for Home's activity trail. Defaults to the trailing 7 days.",
  })
  async activity(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
    @Query('tz') tz?: string,
  ): Promise<DailyActivity[]> {
    return this.srsService.getDailyActivity(userId, days ? Number(days) : undefined, tz);
  }

  @Get('activity/upcoming')
  @ApiOperation({
    summary: 'Upcoming due-word counts (Phase 9, "Upcoming Path")',
    description:
      'Per-day word counts scheduled to come due after today, for the ' +
      "trailing edge of Home's path. A projection, not a commitment -- " +
      'next_due_at moves whenever a word is actually reviewed. Defaults ' +
      'to the next 7 days.',
  })
  async upcomingActivity(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
    @Query('tz') tz?: string,
  ): Promise<UpcomingActivity[]> {
    return this.srsService.getUpcomingActivity(userId, days ? Number(days) : undefined, tz);
  }

  @Post('rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a review rating (FR-3.2)',
    description:
      'One of AGAIN/HARD/GOOD/EASY. Updates FSRS stability/difficulty, the next due date, mastery and ' +
      'leech status using the FSRS-6 scheduler (Phase 10) — see fsrs-scheduler.ts and grading.ts.',
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
