import { Body, Controller, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileLanguage, ProfilesService } from './profiles.service';

@ApiBearerAuth()
@ApiTags('profiles')
@Controller({ path: 'profiles', version: '1' })
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Patch('me')
  @ApiOperation({
    summary: "Update the caller's language settings",
    description:
      'Garden app language (`uiLocale`: en, zh-CN, vi) and meaning language ' +
      '(`meaningLocale`: zh-CN, vi). Omit a field to keep it, send null to clear it. ' +
      'Own row only (profiles_update_self).',
  })
  async updateMine(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileLanguage> {
    return this.profilesService.updateMine(userId, dto);
  }
}
