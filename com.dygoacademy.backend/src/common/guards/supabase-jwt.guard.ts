import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthenticatedUser {
  id: string;
  role: string;
  email?: string;
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/**
 * Verifies the Supabase access token.
 *
 * The signature check is a pure in-memory HMAC against SUPABASE_JWT_SECRET —
 * no database round-trip, no network call to GoTrue. That is what makes the
 * p95 < 0.2ms auth budget in the BRD achievable; any design that looks the
 * user up per request forfeits it immediately.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly secret: string;
  private readonly audience: string;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.secret = this.config.getOrThrow<string>('supabase.jwtSecret');
    this.audience = this.config.get<string>('supabase.jwtAud', 'authenticated');
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        audience: this.audience,
      }) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException('Token has no subject claim');
      }

      request.user = {
        id: payload.sub,
        role: (payload.role as string) ?? 'authenticated',
        email: payload.email as string | undefined,
      };
      return true;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      // Deliberately opaque: distinguishing "bad signature" from "malformed"
      // tells an attacker which half of a forged token to keep working on.
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' ? value : undefined;
  }
}
