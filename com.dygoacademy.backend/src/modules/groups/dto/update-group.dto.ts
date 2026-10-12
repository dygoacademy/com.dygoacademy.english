import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

/**
 * Body for `PATCH /api/v1/groups/:id` (docs/architecture/dygo_academy_api_surface.md §4,
 * Module 1, FR-1.2 — "rename, toggle visibility"). Every field optional: a
 * caller renaming a group should not have to re-send its description.
 */
export class UpdateGroupDto {
  @ApiPropertyOptional({ description: 'New class or workspace name.' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({ description: 'Free-text description shown on the group card.' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Public groups are discoverable and their topics are cloneable (FR-1.1).',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
