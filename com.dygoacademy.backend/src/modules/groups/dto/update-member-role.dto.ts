import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const GROUP_ROLES = ['ADMIN', 'WRITE', 'READ'] as const;
export type GroupRoleInput = (typeof GROUP_ROLES)[number];

/** Body for `PATCH /api/v1/groups/:id/members/:userId` — assign role (FR-1.2). */
export class UpdateMemberRoleDto {
  @ApiProperty({ enum: GROUP_ROLES, description: 'ADMIN > WRITE > READ (tech spec §4.1).' })
  @IsIn(GROUP_ROLES)
  role!: GroupRoleInput;
}
