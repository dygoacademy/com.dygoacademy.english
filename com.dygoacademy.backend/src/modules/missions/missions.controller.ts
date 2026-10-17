import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MissionDay, MissionsService, TodayMissions } from './missions.service';
import type { WeeklyMissions } from './weekly.store';

@ApiBearerAuth()
@ApiTags('missions')
@Controller({ path: 'missions', version: '1' })
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get('today')
  @ApiOperation({
    summary: "Today's daily missions (UI-6)",
    description:
      'REVIEW_DUE, LEARN_NEW and QUIZ (or SPEAK on alternate days, Phase 13 SE1) for the ' +
      "learner's local day (same `tz` fallback as /srs/stats); rows are created on the first " +
      'read. goldenBloom = all 3 done.',
  })
  async today(@CurrentUser('id') userId: string, @Query('tz') tz?: string): Promise<TodayMissions> {
    return this.missions.today(userId, tz);
  }

  @Get('week')
  @ApiOperation({
    summary: 'Missions done per day, trailing 7 days (UI-6)',
    description: 'Oldest first, today last: { date, done (0–3), goldenBloom }.',
  })
  async week(@CurrentUser('id') userId: string, @Query('tz') tz?: string): Promise<MissionDay[]> {
    return this.missions.week(userId, tz);
  }

  @Get('weekly')
  @ApiOperation({
    summary: "This week's 3 weekly missions (A4 This week)",
    description:
      "Rescue wilting words (or Water 20 words when nothing was wilting at the week's first " +
      'read), Use it in a sentence, Sound of the week. Week = local Monday to Sunday (same `tz` ' +
      "fallback as /missions/today); the week's row (sound + goals) is created on the first " +
      'read. All 3 done → +1 rain barrel, once a week, max 3 held.',
  })
  async weekly(
    @CurrentUser('id') userId: string,
    @Query('tz') tz?: string,
  ): Promise<WeeklyMissions> {
    return this.missions.weekly(userId, tz);
  }
}
