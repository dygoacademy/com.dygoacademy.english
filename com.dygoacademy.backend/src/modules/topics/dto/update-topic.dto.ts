import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

/** Body for `PATCH /api/v1/topics/:id` — FR-1.2. Every field optional. */
export class UpdateTopicDto {
  @ApiPropertyOptional({ description: 'New topic title.' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @ApiPropertyOptional({ description: 'Free-text description shown on the topic card.' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Public topics are discoverable and cloneable by any group (FR-1.1).',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
