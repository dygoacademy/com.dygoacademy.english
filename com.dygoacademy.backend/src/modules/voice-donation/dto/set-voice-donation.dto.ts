import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

import {
  VOICE_DONATION_METHODS,
  VOICE_DONATION_REGIONS,
  VoiceDonationMethod,
  VoiceDonationRegion,
} from '../voice-donation.types';

/** Body for `PUT /api/v1/profiles/me/voice-donation`. */
export class SetVoiceDonationDto {
  @ApiProperty({
    description: 'true = "Yes, donate"; false = turn donation off (keeps what was donated).',
  })
  @IsBoolean()
  donating!: boolean;

  @ApiPropertyOptional({
    enum: VOICE_DONATION_METHODS,
    description:
      'Where the learner said yes: setting (A8e), register (AU2 box) or invite. Default setting.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(VOICE_DONATION_METHODS)
  method?: VoiceDonationMethod;

  @ApiPropertyOptional({
    enum: VOICE_DONATION_REGIONS,
    nullable: true,
    description: 'Optional "Where did you grow up?"; null = prefer not to say. Omit to keep.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(VOICE_DONATION_REGIONS)
  region?: VoiceDonationRegion | null;

  @ApiPropertyOptional({ description: 'App language the consent text was shown in (e.g. vi-VN).' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(10)
  locale?: string;
}
