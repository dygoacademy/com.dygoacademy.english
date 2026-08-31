import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

import { SupabaseJwtGuard } from './supabase-jwt.guard';

/**
 * This guard is the only thing standing between an unauthenticated caller
 * and the entire API (it's registered globally as an APP_GUARD — see
 * dygo_academy_api_surface.md §6, "Auth is opt-out"). A regression here is
 * a full-tenant data leak, not a 500, so it gets the most thorough test
 * coverage in the backend even though it is the smallest module.
 */
describe('SupabaseJwtGuard', () => {
  const SECRET = 'test-secret-at-least-32-characters-long';
  let reflector: Reflector;
  let guard: SupabaseJwtGuard;

  const configServiceStub = {
    getOrThrow: (key: string) => {
      if (key === 'supabase.jwtSecret') return SECRET;
      throw new Error(`unexpected getOrThrow(${key})`);
    },
    get: (key: string, fallback?: unknown) => (key === 'supabase.jwtAud' ? fallback : undefined),
  } as unknown as ConfigService;

  function contextWith(headers: Record<string, string>, isPublic = false): ExecutionContext {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers,
    };
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  function signToken(payload: Record<string, unknown>, opts: jwt.SignOptions = {}) {
    return jwt.sign(payload, SECRET, {
      algorithm: 'HS256',
      audience: 'authenticated',
      expiresIn: '1h',
      ...opts,
    });
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new SupabaseJwtGuard(configServiceStub, reflector);
  });

  it('lets a route decorated @Public() through with no token', () => {
    const ctx = contextWith({}, true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a request with no Authorization header', () => {
    const ctx = contextWith({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a header that is not a Bearer scheme', () => {
    const ctx = contextWith({ authorization: `Basic ${signToken({ sub: 'u1' })}` });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a token signed with the wrong secret', () => {
    const forged = jwt.sign({ sub: 'u1' }, 'not-the-real-secret', {
      algorithm: 'HS256',
      audience: 'authenticated',
      expiresIn: '1h',
    });
    const ctx = contextWith({ authorization: `Bearer ${forged}` });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    const expired = signToken({ sub: 'u1' }, { expiresIn: '-10s' });
    const ctx = contextWith({ authorization: `Bearer ${expired}` });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a token with no subject claim', () => {
    const noSub = signToken({ role: 'authenticated' });
    const ctx = contextWith({ authorization: `Bearer ${noSub}` });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a token issued for the wrong audience', () => {
    const wrongAud = signToken({ sub: 'u1' }, { audience: 'some-other-app' });
    const ctx = contextWith({ authorization: `Bearer ${wrongAud}` });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('accepts a valid token and attaches the user to the request', () => {
    const token = signToken({ sub: 'user-123', role: 'authenticated', email: 'a@b.com' });
    const ctx = contextWith({ authorization: `Bearer ${token}` });

    expect(guard.canActivate(ctx)).toBe(true);

    const request = ctx.switchToHttp().getRequest<{ user?: { id: string } }>();
    expect(request.user).toEqual({
      id: 'user-123',
      role: 'authenticated',
      email: 'a@b.com',
    });
  });

  it('defaults role to "authenticated" when the claim is absent', () => {
    const token = signToken({ sub: 'user-456' });
    const ctx = contextWith({ authorization: `Bearer ${token}` });

    guard.canActivate(ctx);

    const request = ctx.switchToHttp().getRequest<{ user?: { role: string } }>();
    expect(request.user?.role).toBe('authenticated');
  });
});
