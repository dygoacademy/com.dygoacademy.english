/**
 * Local check of a Supabase access token (HS256, signed with the project's
 * JWT secret) — the same check the backend's SupabaseJwtGuard does, so the
 * Next.js server no longer asks the auth server (`/auth/v1/user`) who the
 * caller is on every request and prefetch (2026-10-18).
 *
 * Web Crypto only, so it runs in the Edge middleware and in Node alike.
 * `crypto.subtle.verify` compares the signature in constant time.
 *
 * Trade-off, same as the backend: a token stays valid until it expires
 * (JWT_EXPIRY in the root .env), even if the session was revoked earlier.
 */

export interface AccessTokenClaims {
  sub: string;
  email?: string;
  role?: string;
  exp: number;
}

const AUDIENCE = 'authenticated';

const encoder = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    keyCache.set(secret, key);
  }
  return key;
}

function base64UrlBytes(part: string): Uint8Array<ArrayBuffer> {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlJson(part: string): unknown {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(part)));
}

/**
 * The token's claims when the signature, algorithm, audience and expiry all
 * check out; null for anything else (malformed, forged, expired).
 */
export async function verifyAccessToken(
  token: string,
  secret: string,
  nowMs: number = Date.now(),
): Promise<AccessTokenClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;

  try {
    const header = base64UrlJson(headerPart) as { alg?: unknown };
    if (header?.alg !== 'HS256') return null;

    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      base64UrlBytes(signaturePart),
      encoder.encode(`${headerPart}.${payloadPart}`),
    );
    if (!valid) return null;

    const payload = base64UrlJson(payloadPart) as Record<string, unknown>;
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) return null;
    const aud = payload.aud;
    const audiences = Array.isArray(aud) ? aud : [aud];
    if (!audiences.includes(AUDIENCE)) return null;

    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
