#!/usr/bin/env node
/**
 * audio-backfill — queue audio generation for words missing a US or UK clip.
 *
 *   npm run audio-backfill                   # uses ../.env
 *   npm run audio-backfill:prod              # uses ../env-profiles/prod.env
 *   npm run audio-backfill -- --dry-run      # list what would be queued, queue nothing
 *   npm run audio-backfill -- --limit 50     # at most 50 words this run (default 500)
 *   npm run audio-backfill -- --word counterfeit   # remake this word's US + UK clips (repeatable)
 *   npm run audio-backfill -- --library      # remake US + UK clips of every library word
 *   npm run audio-backfill -- --all          # remake US + UK clips of every word
 *
 * Each word has two clips (20261025_word_audio_uk.sql): master_lexicon.audio_url
 * (US, en-US-Neural2-F from ipa_us) and audio_url_uk (UK, en-GB-Neural2-C from
 * ipa_uk). The UK clip needs GOOGLE_TTS_API_KEY; without it only missing US
 * clips are queued. --library is every word in a public group's beds;
 * --all/--library take --limit only when it is given, and a re-run costs no
 * TTS for clips already made (same IPA and voice, same storage key).
 *
 * Run by hand after a database reset/import, or from cron, e.g. nightly:
 *   15 2 * * *  cd /path/to/com.dygoacademy.backend && npm run audio-backfill:prod >> ~/dygo-audio-backfill.log 2>&1
 *
 * This script only QUEUES work; the running backend's EnrichmentProcessor
 * does it, one job at a time. For each word it first reuses audio already in
 * R2 (keyed by md5(word), so audio from before a reset costs nothing) and
 * only calls TTS (Google, from the IPA) for words that never had audio.
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
const HELP_LINES = 18;
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
  for (const key of ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'GOOGLE_TTS_API_KEY']) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return env;
}

function parseArgs(argv) {
  const args = { dryRun: false, limit: null, words: [], scope: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (argv[i] === '--word' && argv[i + 1]) args.words.push(argv[++i].trim().toLowerCase());
    else if (argv[i] === '--all' || argv[i] === '--library') args.scope = argv[i].slice(2);
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, HELP_LINES).join('\n'));
      process.exit(0);
    } else {
      console.error(`unknown option: ${argv[i]} (try --help)`);
      process.exit(1);
    }
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    console.error('--limit must be a positive whole number');
    process.exit(1);
  }
  if (args.scope && args.words.length) {
    console.error('use --word, --all or --library, not more than one');
    process.exit(1);
  }
  // A fill-in run is capped by default; a bulk remake only when asked.
  if (args.limit === null && !args.scope) args.limit = 500;
  return args;
}

async function main() {
  const { dryRun, limit, words, scope } = parseArgs(process.argv.slice(2));
  // --word/--all/--library: remake the clips even though they exist (one
  // that says the word wrong, or a new voice/IPA rule). The worker makes
  // both accents' clips from the IPA.
  const remake = words.length > 0 || !!scope;
  const env = loadEnv();
  // The worker only makes UK clips with a Google key, so don't queue words
  // it would skip.
  const ukMade = !!env.GOOGLE_TTS_API_KEY;

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  let rows;
  try {
    // DATABASE_URL is the bare `authenticator` role with no table grants by
    // design; the app reads master_lexicon as service_role, so do the same.
    await db.query('set role service_role');
    if (words.length) {
      ({ rows } = await db.query(
        `select id, normalized_word, language_code
           from public.master_lexicon
          where normalized_word = any($1::text[])
          order by created_at`,
        [words],
      ));
    } else if (scope) {
      const libraryOnly =
        scope === 'library'
          ? `where exists (select 1 from public.topic_words tw
                             join public.topics t on t.id = tw.topic_id
                             join public.groups g on g.id = t.group_id
                            where tw.lexicon_id = ml.id and g.is_public)`
          : '';
      ({ rows } = await db.query(
        `select ml.id, ml.normalized_word, ml.language_code
           from public.master_lexicon ml
           ${libraryOnly}
          order by ml.created_at
          limit $1`,
        [limit],
      ));
    } else {
      ({ rows } = await db.query(
        `select id, normalized_word, language_code
           from public.master_lexicon
          where audio_url is null or audio_url like $1
             or ($3 and audio_url_uk is null)
          order by created_at
          limit $2`,
        [`${PLACEHOLDER_AUDIO_PREFIX}%`, limit, ukMade],
      ));
    }
  } finally {
    await db.end();
  }

  if (words.length) {
    const found = new Set(rows.map((r) => r.normalized_word));
    const missing = words.filter((w) => !found.has(w));
    if (missing.length) console.log(`audio-backfill: not in master_lexicon: ${missing.join(', ')}`);
  }
  if (rows.length === 0) {
    console.log(remake ? 'audio-backfill: nothing to remake.' : 'audio-backfill: every word has audio. Nothing to queue.');
    return;
  }
  if (!ukMade) console.log('audio-backfill: no GOOGLE_TTS_API_KEY, so US clips only (no UK).');
  if (dryRun && remake) {
    const accents = ukMade ? 'US + UK' : 'US';
    console.log(`audio-backfill (dry run): would remake the ${accents} clips of ${rows.length} word(s):`);
    console.log(rows.map((r) => `  ${r.normalized_word}`).join('\n'));
    return;
  }
  if (dryRun) {
    console.log(`audio-backfill (dry run): ${rows.length} word(s) missing a clip:`);
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
    if (remake) {
      // --word: a learner is waiting on these, so normal priority. A bulk
      // --all/--library run goes at low priority like a fill-in. A fresh job
      // id each run (an earlier remake's id may still be kept as completed).
      const runId = Date.now();
      await queue.addBulk(
        rows.map((r) => ({
          name: AUDIO_BACKFILL_JOB,
          data: { lexiconId: r.id, word: r.normalized_word, languageCode: r.language_code, remake: true },
          opts: {
            jobId: `audio-remake-${r.id}-${runId}`,
            ...(scope ? { priority: LOW_PRIORITY } : {}),
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { age: 3600, count: 1000 },
            removeOnFail: { age: 86_400 },
          },
        })),
      );
      console.log(
        (scope
          ? `audio-backfill: queued a remake of ${rows.length} ${scope === 'library' ? 'library ' : ''}word(s) at low priority.`
          : `audio-backfill: queued a remake of ${rows.map((r) => r.normalized_word).join(', ')}.`) +
          '\nThe running backend makes the new clip; watch: pm2 logs dygo-backend | grep -i audio',
      );
      return;
    }
    // Skip words that already have a job waiting/running (same job id), so the
    // summary reports what this run actually added.
    const existing = await Promise.all(
      rows.map((r) => queue.getJob(`${AUDIO_BACKFILL_JOB}-${r.id}`)),
    );
    // A job that failed (all attempts used) stays for a day under the same
    // id; retry it instead of reporting it as queued.
    const states = await Promise.all(existing.map((j) => (j ? j.getState() : null)));
    const failed = existing.filter((j, i) => j && states[i] === 'failed');
    await Promise.all(failed.map((j) => j.retry('failed')));
    if (failed.length) console.log(`audio-backfill: retrying ${failed.length} failed job(s).`);
    fresh = rows.filter((_, i) => !existing[i]);
    if (fresh.length === 0) {
      if (!failed.length) {
        console.log(`audio-backfill: all ${rows.length} word(s) missing a clip are already queued. Nothing added.`);
      }
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
