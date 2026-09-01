/**
 * Mints dev tokens for the seeded fixture users, signed with
 * SUPABASE_JWT_SECRET — the exact same scheme as
 * com.dygoacademy.backend/scripts/dev-token.js, reimplemented here so this
 * package has no dependency on the backend's script. If that script's
 * signing shape ever changes, mirror the change here too.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { FIXTURES, FixtureName } from './fixtures';

const TTL_SECONDS = 60 * 60 * 12;

function loadSecret(): string {
  const explicit = process.env.SUPABASE_JWT_SECRET;
  if (explicit) return explicit;

  // Repo root .env — three levels up from api/support/.
  const rootEnv = path.resolve(__dirname, '..', '..', '..', '.env');
  if (fs.existsSync(rootEnv)) {
    const match = fs.readFileSync(rootEnv, 'utf8').match(/^SUPABASE_JWT_SECRET=(.*)$/m);
    if (match) return match[1].trim();
  }
  throw new Error(
    'SUPABASE_JWT_SECRET not found. Set it in the environment, or ensure ' +
      `the repo-root .env (expected at ${rootEnv}) contains it.`,
  );
}

const b64 = (input: string) => Buffer.from(input).toString('base64url');

const SECRET = loadSecret();
const tokenCache = new Map<FixtureName, string>();

export function mintToken(name: FixtureName): string {
  const cached = tokenCache.get(name);
  if (cached) return cached;

  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64(
    JSON.stringify({
      sub: FIXTURES[name].id,
      aud: 'authenticated',
      role: 'authenticated',
      iss: 'supabase',
      iat: now,
      exp: now + TTL_SECONDS,
    }),
  );
  const body = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const token = `${body}.${signature}`;
  tokenCache.set(name, token);
  return token;
}
