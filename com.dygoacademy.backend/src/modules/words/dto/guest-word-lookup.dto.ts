import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Query for `GET /api/v1/words/guest-lookup` — the unauthenticated "try a
 * word before you sign up" flow (GuestWordTrial.tsx, live-requested
 * 2026-09-05). Same `word` length bound as CreateWordDto so a guest can't
 * push an oversized string into the lookup query.
 */
export class GuestWordLookupDto {
  @ApiProperty({ description: 'The word to look up.', example: 'resilient' })
  @IsString()
  @Length(1, 100)
  word!: string;

  @ApiPropertyOptional({ description: 'IETF-ish language code.', default: 'en' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  languageCode?: string;
}
