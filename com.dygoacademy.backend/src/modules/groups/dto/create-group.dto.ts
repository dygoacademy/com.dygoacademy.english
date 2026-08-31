import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

/** Body for `POST /api/v1/groups` (dygo_academy_api_surface.md §4, Module 1). */
export class CreateGroupDto {
  @ApiProperty({ description: 'Class or workspace name.', example: "Sarah's IELTS Cohort" })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiPropertyOptional({ description: 'Free-text description shown on the group card.' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Public groups are discoverable and their topics are cloneable (FR-1.1).',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
