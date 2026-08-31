#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Mint a development access token for a seeded fixture user.
 *
 *   npm run token              # list the fixture users
 *   npm run token alex         # token for alex@dygo.test
 *   npm run token alex --curl  # ...plus a ready-to-paste curl command
 *
 * WHY THIS EXISTS: the users in 004_seed_data.sql are inserted straight into
 * auth.users with no password, so they cannot sign in through GoTrue. This
 * signs a token with SUPABASE_JWT_SECRET directly — the same thing GoTrue
 * would issue, which is why SupabaseJwtGuard accepts it.
 *
 * LOCAL DEVELOPMENT ONLY. It needs the signing secret, so it can only ever run
 * somewhere that already has it. Never ship this to a deployed environment.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FIXTURES = {
  sarah: { id: '11111111-1111-1111-1111-111111111111', email: 'sarah@dygo.test', role: 'ADMIN (tutor, owns the class)', tenant: 'Oxford English Center' },
  marco: { id: '22222222-2222-2222-2222-222222222222', email: 'marco@dygo.test', role: 'WRITE (co-teacher)',            tenant: 'Oxford English Center' },
  alex:  { id: '33333333-3333-3333-3333-333333333333', email: 'alex@dygo.test',  role: 'READ (student)',                tenant: 'Oxford English Center' },
  priya: { id: '44444444-4444-4444-4444-444444444444', email: 'priya@dygo.test', role: 'READ (student)',                tenant: 'Oxford English Center' },
  dana:  { id: '55555555-5555-5555-5555-555555555555', email: 'dana@dygo.test',  role: 'ADMIN',                         tenant: 'Rival Academy' },
};

const TTL_SECONDS = 60 * 60 * 12;
const PORT = process.env.PORT || 3001;

function loadSecret() {
  const explicit = process.env.SUPABASE_JWT_SECRET;
  if (explicit) return explicit;

  for (const candidate of ['../.env', '.env']) {
    const file = path.resolve(__dirname, '..', candidate);
    if (!fs.existsSync(file)) continue;
    const match = fs
      .readFileSync(file, 'utf8')
      .match(/^SUPABASE_JWT_SECRET=(.*)$/m);
    if (match) return match[1].trim();
  }
  console.error(
    'error: SUPABASE_JWT_SECRET not found.\n' +
      '       Set it in the environment, or ensure the repo-root .env contains it.',
  );
  process.exit(1);
}

const b64 = (input) =>
  Buffer.from(input).toString('base64url');

function sign(sub, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64(
    JSON.stringify({
      sub,
      // aud and role must match what SupabaseJwtGuard and the RLS policies
      // expect; a token without them verifies but resolves to no permissions.
      aud: 'authenticated',
      role: 'authenticated',
      iss: 'supabase',
      iat: now,
      exp: now + TTL_SECONDS,
    }),
  );
  const body = `${header}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

function usage() {
  console.log('\nSeeded fixture users:\n');
  for (const [key, u] of Object.entries(FIXTURES)) {
    console.log(
      `  ${key.padEnd(6)} ${u.email.padEnd(18)} ${u.role.padEnd(32)} ${u.tenant}`,
    );
  }
  console.log('\nUsage:  npm run token <name> [--curl]\n');
  console.log('Tip: alex and dana are in different tenants — request the same');
  console.log('     endpoint as each to see RLS filtering in action.\n');
}

const name = (process.argv[2] || '').toLowerCase();
if (!name || !FIXTURES[name]) {
  if (name) console.error(`\nerror: unknown user "${name}"`);
  usage();
  process.exit(name ? 1 : 0);
}

const user = FIXTURES[name];
const token = sign(user.id, loadSecret());

if (process.argv.includes('--curl')) {
  console.log(
    `curl -s -H "Authorization: Bearer ${token}" \\\n` +
      `  http://localhost:${PORT}/api/v1/topics | python3 -m json.tool`,
  );
} else {
  console.error(`# ${user.email} — ${user.role}, ${user.tenant}`);
  console.error(`# valid for ${TTL_SECONDS / 3600}h\n`);
  console.log(token);
}
