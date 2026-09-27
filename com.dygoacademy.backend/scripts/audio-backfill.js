#!/usr/bin/env node
/**
 * audio-backfill — queue audio generation for words that have no audio.
 *
 *   npm run audio-backfill                   # uses ../.env
 *   npm run audio-backfill:prod              # uses ../env-profiles/prod.env
 *   npm run audio-backfill -- --dry-run      # list what would be queued, queue nothing
 *   npm run audio-backfill -- --limit 50     # at most 50 words this run (default 500)
 *
 * Run by hand after a database reset/import, or from cron, e.g. nightly:
 *   15 2 * * *  cd /path/to/com.dygoacademy.backend && npm run audio-backfill:prod >> ~/dygo-audio-backfill.log 2>&1
 *
 * This script only QUEUES work; the running backend's EnrichmentProcessor
 * does it, one job at a time. For each word it first reuses audio already in
 * R2 (keyed by md5(word), so audio from before a reset costs nothing) and
 * only calls Gemini TTS for words that never had audio.
 *
 * It deliberately does not run at backend startup: a big backlog would compete
 * with real work. Jobs are queued at LOW priority (BullMQ: jobs without a
 * priority run first), so a word a learner adds is never stuck behind a
 * backfill run. One job id per word, so re-running while earlier jobs are
 * still waiting does not queue duplicates.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { Queue } = require('bullmq');

// Keep in sync with src/queues/queue.constants.ts and
// src/workers/enrichment.processor.ts (PLACEHOLDER_AUDIO_PREFIX).
const ENRICHMENT_QUEUE = 'enrichment-queue';
const AUDIO_BACKFILL_JOB = 'audio-backfill';
const PLACEHOLDER_AUDIO_PREFIX = 'https://cdn.dygo.academy/';
const LOW_PRIORITY = 10;

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
  // A profile overlay already exported into this shell (the :prod script
  // sources ../env-profiles/prod.env first) wins over the base .env.
  for (const key of ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD']) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return env;
}

function parseArgs(argv) {
  const args = { dryRun: false, limit: 500 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 11).join('\n'));
      process.exit(0);
    } else {
      console.error(`unknown option: ${argv[i]} (try --help)`);
      process.exit(1);
    }
  }
  if (!Number.isInteger(args.limit) || args.limit < 1) {
    console.error('--limit must be a positive whole number');
    process.exit(1);
  }
  return args;
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv.slice(2));
  const env = loadEnv();

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  let rows;
  try {
    // DATABASE_URL is the bare `authenticator` role with no table grants by
    // design; the app reads master_lexicon as service_role, so do the same.
    await db.query('set role service_role');
    ({ rows } = await db.query(
      `select id, normalized_word, language_code
         from public.master_lexicon
        where audio_url is null or audio_url like $1
        order by created_at
        limit $2`,
      [`${PLACEHOLDER_AUDIO_PREFIX}%`, limit],
    ));
  } finally {
    await db.end();
  }

  if (rows.length === 0) {
    console.log('audio-backfill: every word has audio. Nothing to queue.');
    return;
  }
  if (dryRun) {
    console.log(`audio-backfill (dry run): ${rows.length} word(s) without audio:`);
    console.log(rows.map((r) => `  ${r.normalized_word}`).join('\n'));
    return;
  }

  const queue = new Queue(ENRICHMENT_QUEUE, {
    connection: {
      host: env.REDIS_HOST || 'localhost',
      port: parseInt(env.REDIS_PORT || '6379', 10),
      password: env.REDIS_PASSWORD || undefined,
    },
  });
  let fresh;
  try {
    // Skip words that already have a job waiting/running (same job id), so the
    // summary reports what this run actually added.
    const existing = await Promise.all(
      rows.map((r) => queue.getJob(`${AUDIO_BACKFILL_JOB}-${r.id}`)),
    );
    fresh = rows.filter((_, i) => !existing[i]);
    if (fresh.length === 0) {
      console.log(`audio-backfill: all ${rows.length} word(s) without audio are already queued. Nothing added.`);
      return;
    }
    await queue.addBulk(
      fresh.map((r) => ({
        name: AUDIO_BACKFILL_JOB,
        data: { lexiconId: r.id, word: r.normalized_word, languageCode: r.language_code },
        opts: {
          // BullMQ rejects ":" in custom job ids.
          jobId: `${AUDIO_BACKFILL_JOB}-${r.id}`,
          priority: LOW_PRIORITY,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86_400 },
        },
      })),
    );
  } finally {
    await queue.close();
  }
  const already = rows.length - fresh.length;
  console.log(
    `audio-backfill: queued ${fresh.length} word(s) at low priority` +
      (already ? ` (${already} already queued).` : '.') +
      (rows.length === limit ? ` More may remain; run again after these finish.` : '') +
      '\nThe running backend processes them; watch: pm2 logs dygo-backend | grep -i audio',
  );
}

main().catch((err) => {
  console.error(`audio-backfill failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
