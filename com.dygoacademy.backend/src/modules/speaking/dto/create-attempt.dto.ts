import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  SPEAKING_ACCENTS,
  SPEAKING_MARK_REASONS,
  SPEAKING_STAGES,
  SpeakingAccent,
  SpeakingMarkReason,
  SpeakingStage,
} from '../speaking.types';

export class WordMarkDto {
  @ApiProperty({ description: 'Token index in the sentence.' })
  @IsInt()
  @Min(0)
  @Max(200)
  index!: number;

  @ApiProperty()
  @IsBoolean()
  ok!: boolean;

  @ApiProperty({ enum: SPEAKING_MARK_REASONS, nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsIn(SPEAKING_MARK_REASONS)
  reason!: SpeakingMarkReason | null;
}

/**
 * Body for `POST /api/v1/speaking/attempts` (Phase 13): the on-device
 * scorer's result for one Compare. Numbers only; the recording never
 * leaves the device (decision D2).
 */
export class CreateSpeakingAttemptDto {
  @ApiProperty({ description: 'speaking_items.id' })
  @IsUUID('loose')
  item_id!: string;

  @ApiProperty({ enum: SPEAKING_ACCENTS })
  @IsIn(SPEAKING_ACCENTS)
  accent!: SpeakingAccent;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;

  @ApiProperty({ enum: SPEAKING_STAGES })
  @IsIn(SPEAKING_STAGES)
  stage!: SpeakingStage;

  @ApiProperty({ type: [WordMarkDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => WordMarkDto)
  word_marks!: WordMarkDto[];

  @ApiProperty({ description: "Length of the learner's trimmed clip in ms." })
  @IsInt()
  @Min(0)
  @Max(120000)
  user_duration_ms!: number;

  @ApiPropertyOptional({
    description:
      'Ignored (2026-10-11): sentences no longer pollinate a word; only POST ' +
      '/speaking/check-pronunciation does. Still accepted so older apps keep working.',
  })
  @IsOptional()
  @IsBoolean()
  harvest?: boolean;

  @ApiPropertyOptional({
    description:
      "The device's IANA time zone, for the SPEAK mission's day when the profile has none.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tz?: string;
}
