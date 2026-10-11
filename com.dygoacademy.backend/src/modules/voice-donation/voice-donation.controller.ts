import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SetVoiceDonationDto } from './dto/set-voice-donation.dto';
import { VoiceDonationService } from './voice-donation.service';
import { VoiceDonationDeleted, VoiceDonationStatus } from './voice-donation.types';

/** A8e Privacy & data · "Donate my voice" (voice donation plan §3–§4). 404 unless VOICE_DONATION_ENABLED. */
@ApiBearerAuth()
@ApiTags('profiles')
@Controller({ path: 'profiles/me/voice-donation', version: '1' })
export class VoiceDonationController {
  constructor(private readonly donations: VoiceDonationService) {}

  @Get()
  @ApiOperation({
    summary: "The caller's voice donation setting",
    description:
      '`{ donating, since, count, region }`: count = recordings kept and not yet deleted. ' +
      '404 when voice donation is off on this server.',
  })
  async status(@CurrentUser('id') userId: string): Promise<VoiceDonationStatus> {
    return this.donations.status(userId);
  }

  @Put()
  @ApiOperation({
    summary: 'Turn voice donation on or off',
    description:
      '`donating: true` records the consent (text version, `method`, `locale`) and makes the ' +
      'random donor code; `region` is the optional "Where did you grow up?". `donating: false` ' +
      'stops keeping new recordings at once and keeps those already donated. Returns the status.',
  })
  async set(
    @CurrentUser('id') userId: string,
    @Body() dto: SetVoiceDonationDto,
  ): Promise<VoiceDonationStatus> {
    return this.donations.set(userId, dto);
  }

  @Delete('recordings')
  @ApiOperation({
    summary: 'Delete my donated recordings',
    description:
      'Turns donation off, removes the account ↔ donor code link and deletes the recordings ' +
      '(queued at once; done within 30 days). Consent records are kept. Returns `{ deleting }`.',
  })
  async deleteRecordings(@CurrentUser('id') userId: string): Promise<VoiceDonationDeleted> {
    return this.donations.deleteRecordings(userId);
  }
}
