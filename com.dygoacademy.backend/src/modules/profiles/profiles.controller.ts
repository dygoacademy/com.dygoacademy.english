import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Keepsakes, ProfileLanguage, ProfilesService } from './profiles.service';

@ApiBearerAuth()
@ApiTags('profiles')
@Controller({ path: 'profiles', version: '1' })
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiOperation({
    summary: "The caller's settings (UI-6)",
    description:
      '`{ id, ui_locale, meaning_locale, english_variety, daily_goal_minutes }`. Own row only.',
  })
  async getMine(@CurrentUser('id') userId: string): Promise<ProfileLanguage> {
    return this.profilesService.getMine(userId);
  }

  @Patch('me')
  @ApiOperation({
    summary: "Update the caller's language settings and preferences",
    description:
      'Garden app language (`uiLocale`: en-US, vi-VN, zh-CN) and meaning language ' +
      '(`meaningLocale`: vi-VN, zh-CN); omit a field to keep it, send null to clear it. ' +
      'UI-6: `englishVariety` (en-US, en-GB) and `dailyGoalMinutes` (integer 1–120), not nullable. ' +
      'Own row only (profiles_update_self).',
  })
  async updateMine(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileLanguage> {
    return this.profilesService.updateMine(userId, dto);
  }
}

/** UI-6 U6-4 — the caller's keepsakes (A8 Me). */
@ApiBearerAuth()
@ApiTags('profiles')
@Controller({ path: 'me', version: '1' })
export class MeController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('keepsakes')
  @ApiOperation({
    summary: "The caller's keepsakes (UI-6)",
    description:
      'Awards lazily (first harvest, best streak 7/30/100, Golden Blooms 10/50) and returns ' +
      '`{ earned: [{ kind, value, earned_at }], next: [{ kind, value, progress, target }], ' +
      'golden_blooms }`. `tz` = same fallback as /srs/stats.',
  })
  async keepsakes(@CurrentUser('id') userId: string, @Query('tz') tz?: string): Promise<Keepsakes> {
    return this.profilesService.keepsakes(userId, tz);
  }
}
