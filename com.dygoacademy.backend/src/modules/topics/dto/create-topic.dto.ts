import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

/** Body for `POST /api/v1/topics` — FR-1.1. */
export class CreateTopicDto {
  @ApiProperty({ description: 'The group this vocabulary set belongs to.' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ description: 'Topic title.', example: 'Phrasal Verbs — Business English' })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({ description: 'Free-text description shown on the topic card.' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Public topics are discoverable and cloneable by any group (FR-1.1).',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
