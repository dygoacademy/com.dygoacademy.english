#!/usr/bin/env node
/**
 * translations-backfill — queue word_translations repair for words that are
 * missing a meaning-locale row.
 *
 *   npm run translations-backfill                 # uses ../.env
 *   npm run translations-backfill:prod             # uses ../env-profiles/prod.env
 *   npm run translations-backfill -- --dry-run      # list what would be queued, queue nothing
 *   npm run translations-backfill -- --limit 50      # at most 50 words this run (default 500)
 *
 * Why this exists (2026-09-29): translations were originally requested from
 * Gemini as an array ("exactly two entries"), and structured-output array
 * schemas don't enforce element count or which locales are present — in
 * practice Gemini reliably returned vi-VN but sometimes dropped zh-CN.
 * gemini-enrichment.service.ts now asks for an object with both "vi-VN" and
 * "zh-CN" as required keys, which Gemini can't partially satisfy, but that
 * only fixes words enriched from here on. This script finds words enriched
 * before the fix (or hit by any other partial write) and repairs them.
 *
 * Only QUEUES work; the running backend's EnrichmentProcessor
 * (`backfillTranslations`) does it, one job at a time, calling
 * `GeminiEnrichmentService.translateMeaning` — cheaper than a full
 * `enrichWord` re-run since definition_en and the example sentence are
 * already in master_lexicon. Jobs are queued at LOW priority, same as
 * audio-backfill, so a learner's own word is never stuck behind a backfill
 * run. One job id per word, so re-running while earlier jobs are still
 * waiting does not queue duplicates.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { Queue } = require('bullmq');

// Keep in sync with src/queues/queue.constants.ts and
// src/workers/enrichment.processor.ts.
const ENRICHMENT_QUEUE = 'enrichment-queue';
const TRANSLATIONS_BACKFILL_JOB = 'translations-backfill';
const MEANING_LOCALES = ['vi-VN', 'zh-CN'];
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
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 16).join('\n'));
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
    // Same role story as audio-backfill.js: DATABASE_URL's role has no
    // table grants by design; the app reads/writes these tables as
    // service_role, so do the same here.
    await db.query('set role service_role');
    ({ rows } = await db.query(
      `select ml.id,
              ml.normalized_word,
              ml.definition_en,
              ml.example_sentences,
              array_agg(missing.locale) as missing_locales
         from public.master_lexicon ml
        cross join unnest($1::text[]) as missing(locale)
        where ml.definition_en is not null
          and not exists (
            select 1 from public.word_translations wt
             where wt.word_id = ml.id and wt.locale = missing.locale
          )
        group by ml.id, ml.normalized_word, ml.definition_en, ml.example_sentences
        order by ml.created_at
        limit $2`,
      [MEANING_LOCALES, limit],
    ));
  } finally {
    await db.end();
  }

  if (rows.length === 0) {
    console.log('translations-backfill: every word has vi-VN and zh-CN translations. Nothing to queue.');
    return;
  }
  if (dryRun) {
    console.log(`translations-backfill (dry run): ${rows.length} word(s) missing translations:`);
    console.log(rows.map((r) => `  ${r.normalized_word} — missing ${r.missing_locales.join(', ')}`).join('\n'));
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
    const existing = await Promise.all(
      rows.map((r) => queue.getJob(`${TRANSLATIONS_BACKFILL_JOB}-${r.id}`)),
    );
    fresh = rows.filter((_, i) => !existing[i]);
    if (fresh.length === 0) {
      console.log(
        `translations-backfill: all ${rows.length} word(s) missing translations are already queued. Nothing added.`,
      );
      return;
    }
    await queue.addBulk(
      fresh.map((r) => {
        const firstExample = Array.isArray(r.example_sentences) ? r.example_sentences[0]?.sentence : null;
        return {
          name: TRANSLATIONS_BACKFILL_JOB,
          data: {
            lexiconId: r.id,
            missingLocales: r.missing_locales,
            definitionEn: r.definition_en,
            exampleSentence: firstExample || r.definition_en,
          },
          opts: {
            jobId: `${TRANSLATIONS_BACKFILL_JOB}-${r.id}`,
            priority: LOW_PRIORITY,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { age: 3600, count: 1000 },
            removeOnFail: { age: 86_400 },
          },
        };
      }),
    );
  } finally {
    await queue.close();
  }
  const already = rows.length - fresh.length;
  console.log(
    `translations-backfill: queued ${fresh.length} word(s) at low priority` +
      (already ? ` (${already} already queued).` : '.') +
      (rows.length === limit ? ` More may remain; run again after these finish.` : '') +
      '\nThe running backend processes them; watch: pm2 logs dygo-backend | grep -i translations',
  );
}

main().catch((err) => {
  console.error(`translations-backfill failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
