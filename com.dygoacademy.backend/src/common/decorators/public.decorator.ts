import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Opt a route out of SupabaseJwtGuard (health checks, public topic browsing). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
