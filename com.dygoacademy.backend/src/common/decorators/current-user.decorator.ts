import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

import { AuthenticatedUser } from '../guards/supabase-jwt.guard';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    return data ? user?.[data] : user;
  },
);
