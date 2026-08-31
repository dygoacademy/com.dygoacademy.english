import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

const CEFR_LEVELS = ['A2', 'B1', 'B2', 'C1'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Body for `POST /api/v1/words` — tech spec §3.4. */
export class CreateWordDto {
  @ApiProperty({ description: 'Topic the word is added to.' })
  @IsUUID()
  topicId!: string;

  @ApiProperty({ description: 'The raw word or phrase to enrich.', example: 'resilient' })
  @IsString()
  @Length(1, 100)
  word!: string;

  @ApiPropertyOptional({ description: 'IETF-ish language code.', default: 'en' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  languageCode?: string;

  @ApiPropertyOptional({
    description: 'CEFR level the generated example sentence should target.',
    enum: CEFR_LEVELS,
  })
  @IsOptional()
  @IsIn(CEFR_LEVELS)
  targetCEFR?: CefrLevel;
}
