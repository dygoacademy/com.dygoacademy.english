import { SetMetadata } from '@nestjs/common';

/** Mirrors the group_role enum. Hierarchy: ADMIN > WRITE > READ. */
export enum GroupRole {
  ADMIN = 'ADMIN',
  WRITE = 'WRITE',
  READ = 'READ',
}

export const ROLES_KEY = 'requiredGroupRole';
/** Minimum group role required for the route. */
export const RequireGroupRole = (role: GroupRole) => SetMetadata(ROLES_KEY, role);
