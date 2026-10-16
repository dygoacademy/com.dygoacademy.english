#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Send a real, one-off web push to a user's stored subscription(s) —
 * bypasses the group/sprint and schedule/tick logic entirely so you can
 * verify the raw pipeline (VAPID signing -> push service -> service
 * worker) without needing a second account or a class group set up.
 *
 *   npm run test-push              # list who currently has a subscription
 *   npm run test-push you@x.com    # send a test push to that user
 *
 * LOCAL/DEV USE ONLY — reads DATABASE_URL + VAPID_* straight out of .env,
 * same loadEnv() approach scripts/dev-token.js uses.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const webpush = require('web-push');

function loadEnv() {
  const env = {};
  for (const candidate of ['../.env', '.env']) {
    const file = path.resolve(__dirname, '..', candidate);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2];
    }
  }
  // A profile overlay already exported into this shell (e.g. via the
  // "test-push:prod" npm script, which sources ../env-profiles/prod.env
  // first) wins over the base .env file, same precedence the app itself
  // uses. Plain `npm run test-push` has no overlay sourced, so it falls
  // through to the base .env's values (localhost) instead.
  for (const key of Object.keys(env)) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const email = process.argv[2];

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are empty in .env — nothing to sign with.');
    process.exit(1);
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:dev@dygo.test', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  // DATABASE_URL connects as plain `authenticator`, which has zero table
  // grants by design (mirrors PostgREST) -- same reason the app itself
  // uses DatabaseService.queryAsService for this table (see
  // push-dispatch.service.ts / migration 015). A session-level SET ROLE is
  // enough here since this script opens one throwaway connection and exits,
  // unlike the app's pooled connections (which scope it per-transaction
  // with SET LOCAL so it can't leak to the next request).
  await client.query('set role service_role');

  if (!email) {
    const { rows } = await client.query(
      `select p.email, count(*) as subscriptions
         from public.push_subscriptions ps
         join public.profiles p on p.id = ps.user_id
        group by p.email
        order by p.email`,
    );
    await client.end();
    if (rows.length === 0) {
      console.log('No one has a stored push subscription yet — enable notifications on the Profile page first.');
      return;
    }
    console.log('Users with a stored subscription:');
    for (const row of rows) console.log(`  ${row.email}  (${row.subscriptions})`);
    console.log('\nRun `npm run test-push <email>` to send one of them a test push.');
    return;
  }

  const { rows } = await client.query(
    `select ps.endpoint, ps.p256dh_key, ps.auth_key, ps.user_agent, ps.last_used_at
       from public.push_subscriptions ps
       join public.profiles p on p.id = ps.user_id
      where p.email = $1`,
    [email],
  );
  await client.end();

  if (rows.length === 0) {
    console.log(`No subscription found for ${email}. Enable notifications on the Profile page while signed in as that user first.`);
    return;
  }

  // Matches PushDispatchService's shape exactly — sw.js reads `url` (an
  // absolute URL, for the notificationclick 1-tap-link handler), not
  // `path`, so a test payload has to build it the same way the real
  // sender does or the click handler silently no-ops.
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';
  const payload = JSON.stringify({
    title: 'Test push',
    body: `Sent manually at ${new Date().toLocaleTimeString()} — if you see this, delivery works end to end.`,
    url: `${frontendUrl}/garden`,
    tag: 'test',
  });

  let sent = 0;
  for (const row of rows) {
    const subscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh_key, auth: row.auth_key },
    };
    try {
      await webpush.sendNotification(subscription, payload);
      sent += 1;
      // Which device: fcm.googleapis.com = Chrome, web.push.apple.com = Safari / iPhone app,
      // updates.push.services.mozilla.com = Firefox.
      console.log(`  sent → ${new URL(row.endpoint).host}  ${row.user_agent || '(no user agent)'}`);
    } catch (err) {
      console.error(`Failed for endpoint ${row.endpoint.slice(0, 60)}...: ${err.statusCode || ''} ${err.message}`);
    }
  }
  console.log(`Sent to ${sent}/${rows.length} subscription(s) for ${email}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
