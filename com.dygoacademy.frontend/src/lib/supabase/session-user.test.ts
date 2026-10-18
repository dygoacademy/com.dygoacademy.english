// @vitest-environment node
import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSessionUser, supabaseServerUrl } from '@/lib/supabase/session-user';

const SECRET = 'test-secret-with-at-least-32-characters';

function token(payload: object, secret = SECRET) {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
}

const validToken = () =>
  token({ sub: 'user-1', email: 'a@b.c', aud: 'authenticated', exp: Date.now() / 1000 + 600 });

function client(accessToken: string | null) {
  const getUser = vi.fn(async () => ({ data: { user: { id: 'from-auth-server', email: 'x@y.z' } } }));
  const getSession = vi.fn(async () => ({
    data: { session: accessToken ? { access_token: accessToken } : null },
  }));
  return { supabase: { auth: { getUser, getSession } } as unknown as SupabaseClient, getUser, getSession };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSessionUser', () => {
  it('verifies the session token locally and never calls the auth server', async () => {
    vi.stubEnv('SUPABASE_JWT_SECRET', SECRET);
    const { supabase, getUser } = client(validToken());
    await expect(getSessionUser(supabase)).resolves.toEqual({ id: 'user-1', email: 'a@b.c' });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('treats a forged session cookie as signed out', async () => {
    vi.stubEnv('SUPABASE_JWT_SECRET', SECRET);
    const forged = token(
      { sub: 'user-1', aud: 'authenticated', exp: Date.now() / 1000 + 600 },
      'not-the-real-secret-but-32-chars-long',
    );
    const { supabase } = client(forged);
    await expect(getSessionUser(supabase)).resolves.toBeNull();
  });

  it('is signed out with no session', async () => {
    vi.stubEnv('SUPABASE_JWT_SECRET', SECRET);
    const { supabase } = client(null);
    await expect(getSessionUser(supabase)).resolves.toBeNull();
  });

  it('falls back to the auth server when the secret is not configured', async () => {
    vi.stubEnv('SUPABASE_JWT_SECRET', '');
    const { supabase, getUser, getSession } = client(validToken());
    await expect(getSessionUser(supabase)).resolves.toEqual({ id: 'from-auth-server', email: 'x@y.z' });
    expect(getUser).toHaveBeenCalledOnce();
    expect(getSession).not.toHaveBeenCalled();
  });
});

describe('supabaseServerUrl', () => {
  it('prefers SUPABASE_INTERNAL_URL on the server', () => {
    vi.stubEnv('SUPABASE_INTERNAL_URL', 'http://localhost:8000');
    expect(supabaseServerUrl('https://sso.dygoacademy.com')).toBe('http://localhost:8000');
  });

  it('uses the public URL when no internal one is set', () => {
    vi.stubEnv('SUPABASE_INTERNAL_URL', '');
    expect(supabaseServerUrl('https://sso.dygoacademy.com')).toBe('https://sso.dygoacademy.com');
  });
});
