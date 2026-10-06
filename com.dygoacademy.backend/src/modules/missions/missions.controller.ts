import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MissionDay, MissionsService, TodayMissions } from './missions.service';

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
}
