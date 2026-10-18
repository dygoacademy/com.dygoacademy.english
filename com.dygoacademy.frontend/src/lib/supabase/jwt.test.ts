// @vitest-environment node
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { verifyAccessToken } from '@/lib/supabase/jwt';

const SECRET = 'test-secret-with-at-least-32-characters';
const NOW = Date.UTC(2026, 9, 18, 1, 0, 0);

const b64url = (value: object | string) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

function sign(payload: object, { secret = SECRET, alg = 'HS256' } = {}) {
  const head = b64url({ alg, typ: 'JWT' });
  const body = b64url(payload);
  const signature = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
}

const claims = {
  sub: 'user-1',
  email: 'learner@example.com',
  role: 'authenticated',
  aud: 'authenticated',
  exp: NOW / 1000 + 600,
};

describe('verifyAccessToken', () => {
  it('returns the claims of a token signed with the secret', async () => {
    await expect(verifyAccessToken(sign(claims), SECRET, NOW)).resolves.toEqual({
      sub: 'user-1',
      email: 'learner@example.com',
      role: 'authenticated',
      exp: claims.exp,
    });
  });

  it('accepts an audience list that includes "authenticated"', async () => {
    const token = sign({ ...claims, aud: ['other', 'authenticated'] });
    await expect(verifyAccessToken(token, SECRET, NOW)).resolves.toMatchObject({ sub: 'user-1' });
  });

  it('rejects a token signed with another secret', async () => {
    const token = sign(claims, { secret: 'someone-elses-secret-of-32-characters' });
    await expect(verifyAccessToken(token, SECRET, NOW)).resolves.toBeNull();
  });

  it('rejects a token whose payload was edited after signing', async () => {
    const [head, , signature] = sign(claims).split('.');
    const forged = `${head}.${b64url({ ...claims, sub: 'user-2' })}.${signature}`;
    await expect(verifyAccessToken(forged, SECRET, NOW)).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = sign({ ...claims, exp: NOW / 1000 - 1 });
    await expect(verifyAccessToken(token, SECRET, NOW)).resolves.toBeNull();
  });

  it('rejects any algorithm other than HS256, including "none"', async () => {
    await expect(verifyAccessToken(sign(claims, { alg: 'HS512' }), SECRET, NOW)).resolves.toBeNull();
    const unsigned = `${b64url({ alg: 'none' })}.${b64url(claims)}.`;
    await expect(verifyAccessToken(unsigned, SECRET, NOW)).resolves.toBeNull();
  });

  it('rejects a token for another audience, or without a subject', async () => {
    await expect(verifyAccessToken(sign({ ...claims, aud: 'anon' }), SECRET, NOW)).resolves.toBeNull();
    const { sub: _sub, ...noSub } = claims;
    await expect(verifyAccessToken(sign(noSub), SECRET, NOW)).resolves.toBeNull();
  });

  it('rejects malformed input', async () => {
    await expect(verifyAccessToken('not-a-jwt', SECRET, NOW)).resolves.toBeNull();
    await expect(verifyAccessToken('a.b.c', SECRET, NOW)).resolves.toBeNull();
    await expect(verifyAccessToken('', SECRET, NOW)).resolves.toBeNull();
  });
});
