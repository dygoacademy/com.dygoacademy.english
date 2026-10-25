#!/usr/bin/env ts-node
/**
 * pron-backfill — pronunciation v2 data for words that don't have it yet:
 * the stones (master_lexicon.syllables_us / _uk, with each syllable's place
 * in the word clip) and the P1 tip (pron_tip). See src/ai/pron-data.service.ts.
 *
 *   npm run pron-backfill -- --dry-run         # what would be made, and which words get no stones
 *   npm run pron-backfill                      # words missing any of it (at most 500)
 *   npm run pron-backfill -- --limit 50        # at most 50 words this run
 *   npm run pron-backfill -- --word mitigate   # remake this word's data (repeatable)
 *   npm run pron-backfill -- --library         # remake every library word's data
 *   npm run pron-backfill -- --all             # remake every word's data
 *
 * Unlike audio-backfill this does the work itself (Google TTS, storage,
 * database), so it doesn't need a backend that knows the new columns.
 * Google TTS characters count against today's google_tts cap
 * (api_usage_daily), like the app's own calls; it stops at the cap and a
 * re-run tomorrow carries on. Clips already made are reused (same key).
 * Env: the root .env (DATABASE_URL, GOOGLE_TTS_API_KEY, storage); a profile
 * overlay exported into the shell wins.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { Client } from 'pg';

import { GoogleWordTtsService } from '../src/ai/google-word-tts.service';
import { PronDataService, pronDataUpdate, type PronDataRow } from '../src/ai/pron-data.service';
import { UsageCapExceededError, UsageCapService } from '../src/ai/usage-cap.service';
import { storageConfigFrom } from '../src/config/storage-config';
import { buildSyllables, stoneText, stonesShowIpa } from '../src/modules/speaking/pron-syllables';
import { StorageService } from '../src/storage/storage.service';

const HELP_LINES = 22;

interface Args {
  dryRun: boolean;
  limit: number | null;
  words: string[];
  scope: 'all' | 'library' | null;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, limit: null, words: [], scope: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (a === '--word' && argv[i + 1]) args.words.push(argv[++i].trim().toLowerCase());
    else if (a === '--all' || a === '--library') args.scope = a.slice(2) as 'all' | 'library';
    else if (a === '--help' || a === '-h') {
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, HELP_LINES).join('\n'));
      process.exit(0);
    } else throw new Error(`unknown option ${a} (see --help)`);
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error('--limit must be a positive whole number');
  }
  if (args.scope && args.words.length) throw new Error('use --word, --all or --library, not more than one');
  if (args.limit === null && !args.scope && !args.words.length) args.limit = 500;
  return args;
}

function loadEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const candidate of ['../.env', '.env']) {
    const file = path.resolve(__dirname, '..', candidate);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  // A profile overlay already exported into this shell wins over the base .env.
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && /^(DATABASE_URL|GOOGLE_TTS_|STORAGE_|R2_|RUSTFS_|MEDIA_)/.test(k)) env[k] = v;
  }
  return env;
}

/** A ConfigService stand-in: the few keys these services read. */
function configFrom(env: Record<string, string | undefined>) {
  const storage = storageConfigFrom(env);
  const values: Record<string, unknown> = {
    'storage.bucket': storage.bucket,
    'storage.publicUrl': storage.publicUrl,
    'storage.endpoint': storage.endpoint,
    'storage.region': storage.region,
    'storage.forcePathStyle': storage.forcePathStyle,
    'storage.accessKeyId': storage.accessKeyId,
    'storage.secretAccessKey': storage.secretAccessKey,
    'ai.googleTtsApiKey': env.GOOGLE_TTS_API_KEY ?? '',
    'usage.googleTtsDailyChars': env.GOOGLE_TTS_DAILY_CHAR_LIMIT
      ? Number(env.GOOGLE_TTS_DAILY_CHAR_LIMIT)
      : undefined,
  };
  return { get: <T>(key: string, fallback?: T): T => (values[key] ?? fallback) as T };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  // DATABASE_URL is the bare `authenticator` role; the app writes master_lexicon as service_role.
  await db.query('set role service_role');
  const dbShim = {
    queryAsService: async <T>(text: string, params: unknown[] = []) =>
      (await db.query(text, params)).rows as T[],
  };
  const config = configFrom(env);
  const storage = new StorageService(config as never);
  const usage = new UsageCapService(dbShim as never, config as never);
  const tts = new GoogleWordTtsService(config as never, usage);
  const maker = new PronDataService(tts, storage);

  try {
    const cols = `ml.id, ml.normalized_word, ml.language_code, ml.ipa_us, ml.ipa_uk,
                  ml.audio_url_us, ml.audio_url_uk`;
    let rows: PronDataRow[];
    if (args.words.length) {
      ({ rows } = await db.query(
        `select ${cols} from public.master_lexicon ml where ml.normalized_word = any($1::text[]) order by ml.created_at`,
        [args.words],
      ));
      const found = new Set(rows.map((r) => r.normalized_word));
      const missing = args.words.filter((w) => !found.has(w));
      if (missing.length) console.log(`pron-backfill: not in master_lexicon: ${missing.join(', ')}`);
    } else if (args.scope) {
      const library =
        args.scope === 'library'
          ? `where exists (select 1 from public.topic_words tw
                             join public.topics t on t.id = tw.topic_id
                             join public.groups g on g.id = t.group_id
                            where tw.lexicon_id = ml.id and g.is_public)`
          : '';
      ({ rows } = await db.query(
        `select ${cols} from public.master_lexicon ml ${library} order by ml.created_at limit $1`,
        [args.limit],
      ));
    } else {
      const made = tts.isConfigured();
      ({ rows } = await db.query(
        `select ${cols} from public.master_lexicon ml
          where ml.syllables_us is null or ml.pron_tip is null
             or ($2 and ml.syllables_uk is null)
          order by ml.created_at
          limit $1`,
        [args.limit, made],
      ));
    }
    if (rows.length === 0) {
      console.log('pron-backfill: nothing to do.');
      return;
    }
    if (!tts.isConfigured()) {
      console.log('pron-backfill: no GOOGLE_TTS_API_KEY: US stones and tips only (no spans, no UK).');
    }

    const noStones = (r: PronDataRow) =>
      buildSyllables(r.normalized_word, r.ipa_us ?? r.ipa_uk).length === 0 &&
      buildSyllables(r.normalized_word, r.ipa_uk ?? r.ipa_us).length === 0;
    if (args.dryRun) {
      console.log(`pron-backfill (dry run): ${rows.length} word(s):`);
      for (const r of rows) {
        const us = buildSyllables(r.normalized_word, r.ipa_us ?? r.ipa_uk);
        console.log(
          `  ${r.normalized_word.padEnd(24)} ${us.length ? us.map(stoneText).join(' · ') : '(no stones: blocked)'}`,
        );
      }
      const blocked = rows.filter(noStones).map((r) => r.normalized_word);
      const ipaStones = rows
        .filter((r) => stonesShowIpa(buildSyllables(r.normalized_word, r.ipa_us ?? r.ipa_uk)))
        .map((r) => r.normalized_word);
      console.log(`pron-backfill (dry run): ${blocked.length} word(s) would get no stones: ${blocked.join(', ') || 'none'}`);
      console.log(`pron-backfill (dry run): ${ipaStones.length} word(s) would show IPA on their stones: ${ipaStones.join(', ') || 'none'}`);
      return;
    }

    let done = 0;
    const blocked: string[] = [];
    const failed: string[] = [];
    for (const row of rows) {
      try {
        const data = await maker.make(row);
        const update = pronDataUpdate(row.id, data);
        await db.query(update.text, update.params);
        done += 1;
        if (!data.syllables_us && !data.syllables_uk) blocked.push(row.normalized_word);
        if (done % 25 === 0) console.log(`pron-backfill: ${done} of ${rows.length}…`);
      } catch (err) {
        if (err instanceof UsageCapExceededError) {
          console.log(`pron-backfill: ${err.message}. Stopped after ${done} word(s); run again tomorrow.`);
          break;
        }
        failed.push(row.normalized_word);
        console.log(`pron-backfill: "${row.normalized_word}" failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    console.log(
      `pron-backfill: made ${done} of ${rows.length} word(s).` +
        (blocked.length ? `\n  no stones (not offered in Pronunciation): ${blocked.join(', ')}` : '') +
        (failed.length ? `\n  failed: ${failed.join(', ')}` : '') +
        (args.limit !== null && rows.length === args.limit ? '\n  More may remain; run again.' : ''),
    );
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(`pron-backfill failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
