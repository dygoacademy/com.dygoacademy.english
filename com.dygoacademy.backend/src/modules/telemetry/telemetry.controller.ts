import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MediaLoadEventsDto } from './dto/media-events.dto';
import { headerValue, TelemetryService } from './telemetry.service';

@ApiBearerAuth()
@ApiTags('telemetry')
@Controller({ path: 'telemetry', version: '1' })
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @Post('media')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record how long audio took to start (option 2, 2026-10-04)',
    description:
      'A batch of plays: kind, host, played/error, ms from tap to sound, from the phone ' +
      'cache or not, network type. Country/city come from Cloudflare headers; no IP or ' +
      'file URL is stored.',
  })
  async media(
    @CurrentUser('id') userId: string,
    @Body() dto: MediaLoadEventsDto,
    @Headers('cf-ipcountry') country?: string,
    @Headers('cf-ipcity') city?: string,
  ): Promise<{ recorded: number }> {
    return this.telemetry.recordMedia(userId, dto.events, {
      country: headerValue(country, 8),
      city: headerValue(city, 80),
    });
  }
}
