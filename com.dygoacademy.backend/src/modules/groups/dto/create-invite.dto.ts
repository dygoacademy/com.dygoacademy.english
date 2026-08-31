import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const GROUP_ROLES = ['ADMIN', 'WRITE', 'READ'] as const;
export type GroupRoleInput = (typeof GROUP_ROLES)[number];

/** Body for `POST /api/v1/groups/:id/invites` — mint a magic link (FR-1.3). */
export class CreateInviteDto {
  @ApiPropertyOptional({
    enum: GROUP_ROLES,
    default: 'READ',
    description: 'Role granted to whoever redeems the link.',
  })
  @IsOptional()
  @IsIn(GROUP_ROLES)
  grantRole?: GroupRoleInput;

  @ApiPropertyOptional({ description: 'Caps how many people can join through this one link.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  maxUses?: number;

  @ApiPropertyOptional({
    description: 'Link expires this many hours from now. Omit for a link that never expires.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 365)
  expiresInHours?: number;
}
