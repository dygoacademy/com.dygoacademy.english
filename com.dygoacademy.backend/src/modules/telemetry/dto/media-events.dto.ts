import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const MEDIA_EVENT_KINDS = ['word', 'speaking'] as const;
export const MEDIA_EVENT_OUTCOMES = ['played', 'error'] as const;

export class MediaLoadEventDto {
  @ApiProperty({ enum: MEDIA_EVENT_KINDS })
  @IsIn(MEDIA_EVENT_KINDS)
  kind!: (typeof MEDIA_EVENT_KINDS)[number];

  @ApiProperty({ description: 'Host the audio came from, e.g. media.dygoacademy.com (no path).' })
  @IsString()
  @Length(1, 100)
  host!: string;

  @ApiProperty({ enum: MEDIA_EVENT_OUTCOMES })
  @IsIn(MEDIA_EVENT_OUTCOMES)
  outcome!: (typeof MEDIA_EVENT_OUTCOMES)[number];

  @ApiProperty({ description: 'Tap → sound (or → error), in ms.' })
  @IsInt()
  @Min(0)
  @Max(120000)
  ms!: number;

  @ApiProperty({ description: "True when the file was already in the phone's media cache." })
  @IsBoolean()
  from_cache!: boolean;

  @ApiPropertyOptional({
    description: 'navigator.connection.effectiveType (4g, 3g…), where supported.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  effective_type?: string;
}

/** Body of `POST /api/v1/telemetry/media`: up to 50 plays per batch. */
export class MediaLoadEventsDto {
  @ApiProperty({ type: [MediaLoadEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MediaLoadEventDto)
  events!: MediaLoadEventDto[];
}
