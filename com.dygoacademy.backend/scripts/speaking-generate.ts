#!/usr/bin/env ts-node
/**
 * speaking-generate — Phase 13 T2: native UK + US sentence audio with word
 * timings, one item per word, from Google Cloud Text-to-Speech (decision
 * D1 = B: SSML <mark> timepoints).
 *
 *   npm run speaking-generate -- --topic <uuid> --dry-run    # a bed's words: what would be made + cost
 *   npm run speaking-generate -- --topic <uuid>              # make it (uses ../.env)
 *   npm run speaking-generate -- --all --limit 200           # any READY word without an item yet
 *   npm run speaking-generate:prod -- --all --refresh --limit 5000  # also remake items not at SPEAKING_RATE
 *   npm run speaking-generate:prod -- --topic <uuid>         # ../env-profiles/prod.env on top
 *   npm run speaking-generate -- --fixture --out <dir>       # local test clip, no keys, no DB
 *
 * Options: --accents uk,us (default both) · --limit N (default 50) ·
 * --force (re-synthesize and overwrite audio that already exists) ·
 * --refresh (with --all: also words that have an item; clips not made at
 * this voice + SPEAKING_RATE are remade, the rest skipped) ·
 * --max-usd N (stop before this run's TTS passes $N at list price, default 2) ·
 * --yes (no --max-usd stop; the daily cap GOOGLE_TTS_DAILY_CHAR_LIMIT,
 * default 300000 chars, always applies). A stopped run keeps what it made.
 *
 * A speaking item belongs to the word (master_lexicon), shared by every bed
 * that has it; --topic just picks which words to do. For each word: take its
 * first example sentence, find the target word, and for each accent
 *   1. if the word's item already has that accent's clip for this sentence,
 *      voice and speaking rate → skip (unless --force);
 *   2. if R2 already has the clip + its timings JSON (same sentence, voice and
 *      rate, e.g. after a database reset) → reuse them, no TTS call (unless --force);
 *   3. otherwise call Google TTS with a <mark> before every word, build the
 *      timings (src/modules/speaking/speaking-timings.ts), check them, and
 *      upload `speaking/en/<uk|us>/<md5(voice[@rate]|sentence)>.m4a` (AAC, linked),
 *      the `.wav` copy and the `.json` timings.
 * Then upsert speaking_items (one row per word) as service_role.
 *
 * Env: DATABASE_URL, storage as the backend (RUSTFS_* by default, or
 * STORAGE_PROVIDER=r2 + R2_*; src/config/storage-config.ts), GOOGLE_TTS_API_KEY (a Google
 * Cloud API key restricted to the Text-to-Speech API), optional
 * SPEAKING_VOICE_UK / SPEAKING_VOICE_US (Neural2 voices support <mark>;
 * Chirp 3 HD voices don't take SSML), optional SPEAKING_RATE (TTS speaking
 * rate, default 0.85: the voices' own pace is quick for self-taught learners;
 * 1 = the voice's pace and the original file names).
 *
 * --fixture writes one item (the handover's "mitigate" sentence) with clips
 * from macOS `say`, spoken one word at a time so the word timings are exact.
 * It sounds robotic: it's for building and testing the frontend (T3–T5)
 * before real audio exists, never for learners.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Client } from 'pg';

import {
  buildSsml,
  buildTimings,
  encodeWav,
  findTargetIndex,
  parseWav,
  PcmClip,
  SpeakingAccent,
  SpeakingTimings,
  startsFromTimepoints,
  targetIpaFor,
  tokenize,
  trimSilence,
  validateTimings,
} from '../src/modules/speaking/speaking-timings';
import { storageConfigFrom } from '../src/config/storage-config';
import { encodeForWeb, filesToStore } from '../src/storage/audio-encode';
import { StorageService } from '../src/storage/storage.service';

const DEFAULT_VOICES: Record<SpeakingAccent, string> = {
  UK: 'en-GB-Neural2-C',
  US: 'en-US-Neural2-F',
};
/** Slower than the voices' own pace, which learners found too fast (2026-10-11). */
const DEFAULT_SPEAKING_RATE = 0.85;
/** Google Neural2 list price, USD per character, for the cost estimate only. */
const PRICE_PER_CHAR = 16 / 1_000_000;
const SAMPLE_RATE = 24000;
const TTS_URL = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize';

interface Args {
  topic?: string;
  all: boolean;
  accents: SpeakingAccent[];
  limit: number;
  dryRun: boolean;
  force: boolean;
  /** With --all: also words that already have an item (remake clips not at this rate). */
  refresh: boolean;
  fixture: boolean;
  out?: string;
  /** Stop before this run's TTS would pass this many USD at list price (S13). */
  maxUsd: number;
  /** Skip the --max-usd stop (the daily cap still applies). */
  yes: boolean;
}

function usage(): never {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 21).join('\n'));
  process.exit(0);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    all: false,
    accents: ['UK', 'US'],
    limit: 50,
    dryRun: false,
    force: false,
    refresh: false,
    fixture: false,
    maxUsd: 2,
    yes: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--topic') args.topic = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--accents') {
      args.accents = argv[++i].split(',').map((s) => s.trim().toUpperCase()) as SpeakingAccent[];
    } else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--refresh') args.refresh = true;
    else if (a === '--fixture') args.fixture = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--max-usd') args.maxUsd = parseFloat(argv[++i]);
    else if (a === '--yes') args.yes = true;
    else if (a === '--help' || a === '-h') usage();
    else throw new Error(`unknown option ${a} (see --help)`);
  }
  if (args.accents.some((x) => x !== 'UK' && x !== 'US')) throw new Error('--accents takes uk,us');
  if (!args.fixture && !args.topic === !args.all) {
    throw new Error('give --topic <uuid> or --all (or --fixture)');
  }
  if (args.fixture && !args.out) throw new Error('--fixture needs --out <dir>');
  if (!(args.maxUsd >= 0)) throw new Error('--max-usd takes a number of dollars');
  return args;
}

/** ../.env then .env, with variables already exported in the shell winning (as audio-backfill). */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const candidate of ['../.env', '.env']) {
    const file = path.resolve(__dirname, '..', candidate);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
    }
  }
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  return env;
}

// ---------------------------------------------------------------------------
// Synthesizers: both return a clip plus one start time per token.

interface Synthesis {
  clip: PcmClip;
  wav: Buffer;
  starts: number[];
  end: number | null;
}

async function synthesizeGoogle(
  apiKey: string,
  tokens: string[],
  accent: SpeakingAccent,
  voice: string,
  speakingRate: number,
): Promise<Synthesis> {
  const res = await fetch(`${TTS_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      input: { ssml: buildSsml(tokens) },
      voice: { languageCode: accent === 'UK' ? 'en-GB' : 'en-US', name: voice },
      // Timepoints come back in the slowed clip's own seconds.
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SAMPLE_RATE, speakingRate },
      enableTimePointing: ['SSML_MARK'],
    }),
  });
  if (!res.ok) {
    throw new Error(`Google TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const body = (await res.json()) as {
    audioContent: string;
    timepoints?: { markName: string; timeSeconds?: number }[];
  };
  // LINEAR16 comes back as a complete WAV (header included).
  const wav = Buffer.from(body.audioContent, 'base64');
  const clip = parseWav(wav);
  const { starts, end } = startsFromTimepoints(tokens.length, body.timepoints ?? []);
  return { clip, wav, starts, end };
}

/** macOS `say`, one word at a time, joined with short gaps: exact word starts. */
function synthesizeSay(tokens: string[], accent: SpeakingAccent): Synthesis {
  const voice = accent === 'UK' ? 'Daniel' : 'Samantha';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'speaking-say-'));
  const gap = new Int16Array(Math.round(0.06 * SAMPLE_RATE));
  const parts: Int16Array[] = [new Int16Array(Math.round(0.1 * SAMPLE_RATE))];
  const starts: number[] = [];
  let at = parts[0].length;
  try {
    tokens.forEach((token, i) => {
      const file = path.join(tmp, `${i}.wav`);
      execFileSync('say', [
        '-v',
        voice,
        '-o',
        file,
        '--file-format=WAVE',
        `--data-format=LEI16@${SAMPLE_RATE}`,
        token,
      ]);
      const word = parseWav(fs.readFileSync(file));
      const { start, end } = trimSilence(word, 0, word.samples.length / word.sampleRate);
      const cut = word.samples.slice(
        Math.round(start * SAMPLE_RATE),
        Math.round(end * SAMPLE_RATE),
      );
      starts.push(at / SAMPLE_RATE);
      parts.push(cut, gap);
      at += cut.length + gap.length;
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  parts.push(new Int16Array(Math.round(0.15 * SAMPLE_RATE)));
  const samples = new Int16Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    samples.set(p, o);
    o += p.length;
  }
  const clip = { samples, sampleRate: SAMPLE_RATE };
  return { clip, wav: encodeWav(clip), starts, end: null };
}

function timingsFor(
  s: Synthesis,
  tokens: string[],
  targetIndex: number,
  ipa: string | null,
): SpeakingTimings {
  const timings = buildTimings({
    tokens,
    starts: s.starts,
    end: s.end,
    clip: s.clip,
    targetIndex,
    targetIpa: ipa,
  });
  const errors = validateTimings(timings, { tokenCount: tokens.length, targetIndex });
  if (errors.length) throw new Error(`timings invalid: ${errors.join('; ')}`);
  return timings;
}

// ---------------------------------------------------------------------------
// --fixture

const FIXTURE = {
  word: 'mitigate',
  sentence: 'Planting more trees can help mitigate the effects of climate change.',
  ipa: '/ˈmɪt.ɪ.ɡeɪt/',
};

async function runFixture(args: Args): Promise<void> {
  const out = path.resolve(args.out as string);
  fs.mkdirSync(out, { recursive: true });
  const tokens = tokenize(FIXTURE.sentence);
  const targetIndex = findTargetIndex(tokens, FIXTURE.word);
  const item: Record<string, unknown> = {
    id: 'fixture-mitigate',
    word: FIXTURE.word,
    sentence: FIXTURE.sentence,
    target_index: targetIndex,
    ipa_uk: FIXTURE.ipa,
    ipa_us: FIXTURE.ipa,
    note: 'Phase 13 dev fixture: macOS say, one word at a time (robotic). Not for learners.',
  };
  for (const accent of args.accents) {
    const s = synthesizeSay(tokens, accent);
    // Same pair as production: AAC .m4a (linked) + the .wav copy.
    const files = filesToStore(
      await encodeForWeb(s.wav),
      (ext) => `fixture-mitigate-${accent.toLowerCase()}.${ext}`,
    );
    for (const f of files) fs.writeFileSync(path.join(out, f.key), f.body);
    const file = files[0].key;
    item[`audio_${accent.toLowerCase()}_file`] = file;
    item[`timings_${accent.toLowerCase()}`] = timingsFor(s, tokens, targetIndex, FIXTURE.ipa);
    console.log(`  ${accent}: ${file} (${(s.clip.samples.length / SAMPLE_RATE).toFixed(2)} s)`);
  }
  fs.writeFileSync(path.join(out, 'fixture-mitigate.json'), JSON.stringify(item, null, 2) + '\n');
  console.log(`  wrote ${path.join(out, 'fixture-mitigate.json')}`);
}

// ---------------------------------------------------------------------------
// Topic run

interface WordRow {
  lexicon_id: string;
  word: string;
  ipa_uk: string | null;
  ipa_us: string | null;
  sentence: string | null;
  /** The word's existing item, if any. */
  item_sentence: string | null;
  audio_uk_path: string | null;
  audio_us_path: string | null;
}

async function exists(s3: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || (err as { name?: string }).name === 'NotFound') return false;
    throw err;
  }
}

async function runTopic(args: Args, env: Record<string, string>): Promise<void> {
  const apiKey = env.GOOGLE_TTS_API_KEY;
  if (!apiKey && !args.dryRun) {
    throw new Error('GOOGLE_TTS_API_KEY is not set (add it to ../.env). Nothing was generated.');
  }
  const voices: Record<SpeakingAccent, string> = {
    UK: env.SPEAKING_VOICE_UK || DEFAULT_VOICES.UK,
    US: env.SPEAKING_VOICE_US || DEFAULT_VOICES.US,
  };
  const speakingRate = env.SPEAKING_RATE ? parseFloat(env.SPEAKING_RATE) : DEFAULT_SPEAKING_RATE;
  // Google takes 0.25–4; keep to a range that still sounds like speech.
  if (!(speakingRate >= 0.5 && speakingRate <= 1.5)) {
    throw new Error(`SPEAKING_RATE must be between 0.5 and 1.5 (got ${env.SPEAKING_RATE})`);
  }
  // Same store as the backend (RustFS → media.dygoacademy.com, or R2).
  const store = storageConfigFrom(env);
  const bucket = store.bucket;
  const s3 = new S3Client({
    endpoint: store.endpoint,
    region: store.region,
    forcePathStyle: store.forcePathStyle,
    credentials: { accessKeyId: store.accessKeyId, secretAccessKey: store.secretAccessKey },
  });
  console.log(`Storage: ${store.provider} (${store.publicUrl})`);
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();

  let ttsChars = 0;
  // S13 spend guards: this run's real TTS characters, the daily cap (counted
  // in api_usage_daily with the backend's Gemini calls) and why we stopped.
  let spentChars = 0;
  const dailyCharLimit = parseInt(env.GOOGLE_TTS_DAILY_CHAR_LIMIT || '300000', 10);
  let stopReason: string | null = null;
  let made = 0;
  let reused = 0;
  let skipped = 0;
  try {
    // Reads and writes as service_role, like the backend's workers.
    await db.query('begin');
    await db.query("select set_config('role', 'service_role', true)");
    if (args.topic) {
      const topic = await db.query<{ title: string }>(
        'select title from public.topics where id = $1',
        [args.topic],
      );
      if (!topic.rows[0]) throw new Error(`topic ${args.topic} not found`);
      console.log(`Topic: ${topic.rows[0].title}${args.dryRun ? '  (dry run)' : ''}`);
    } else {
      console.log(
        `All READY words${args.refresh ? '' : ' without an item'}${args.dryRun ? '  (dry run)' : ''}`,
      );
    }
    console.log(`Voices: UK ${voices.UK}, US ${voices.US}, speaking rate ${speakingRate}`);

    const words = await db.query<WordRow>(
      `select ml.id as lexicon_id, ml.normalized_word as word, ml.ipa_uk, ml.ipa_us,
              ml.example_sentences -> 0 ->> 'sentence' as sentence,
              si.sentence as item_sentence, si.audio_uk_path, si.audio_us_path
         from public.master_lexicon ml
         left join public.speaking_items si on si.lexicon_id = ml.id
        where exists (
                select 1 from public.topic_words tw
                 where tw.lexicon_id = ml.id and tw.status = 'READY'
                   and ($1::uuid is null or tw.topic_id = $1::uuid))
          and ($1::uuid is not null or $3::boolean or si.id is null)
        order by ml.normalized_word
        limit $2`,
      [args.topic ?? null, args.limit, args.refresh],
    );

    for (const w of words.rows) {
      const sentence = w.sentence?.trim();
      if (!sentence) {
        console.log(`  - ${w.word}: no example sentence, skipped`);
        skipped++;
        continue;
      }
      const tokens = tokenize(sentence);
      const targetIndex = findTargetIndex(tokens, w.word);
      if (targetIndex < 0) {
        console.log(`  - ${w.word}: not found in "${sentence}", skipped`);
        skipped++;
        continue;
      }
      const result: Partial<Record<SpeakingAccent, { key: string; timings: SpeakingTimings }>> = {};
      for (const accent of args.accents) {
        const a = accent.toLowerCase() as 'uk' | 'us';
        const label = `${w.word} ${accent}`;
        const keyFor = (ext: 'm4a' | 'wav') =>
          StorageService.speakingAudioKeyFor(
            sentence,
            accent,
            voices[accent],
            'en',
            ext,
            speakingRate,
          );
        const current = w[`audio_${a}_path`];
        // Same sentence, voice and rate (an older, faster clip has another key).
        if (current && (current === keyFor('m4a') || current === keyFor('wav')) && !args.force) {
          console.log(`  = ${label}: already in speaking_items`);
          continue;
        }
        const jsonKey = keyFor('m4a').replace(/\.m4a$/, '.json');
        // An earlier clip for this sentence + voice: the .m4a, else an older .wav.
        let key = keyFor('m4a');
        if (!(await exists(s3, bucket, key))) key = keyFor('wav');
        if (!args.force && (await exists(s3, bucket, key)) && (await exists(s3, bucket, jsonKey))) {
          const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: jsonKey }));
          const timings = JSON.parse(await obj.Body!.transformToString()) as SpeakingTimings;
          const errors = validateTimings(timings, { tokenCount: tokens.length, targetIndex });
          if (errors.length === 0) {
            console.log(`  ↺ ${label}: reusing ${key}`);
            result[accent] = { key, timings };
            reused++;
            continue;
          }
          console.log(`  ! ${label}: stored timings invalid (${errors[0]}), regenerating`);
        }
        const chars = buildSsml(tokens).length;
        if (!args.dryRun) {
          const usd = (spentChars + chars) * PRICE_PER_CHAR;
          if (!args.yes && usd > args.maxUsd) {
            stopReason =
              `the next clip would take this run past --max-usd $${args.maxUsd} ` +
              `(≈ $${usd.toFixed(2)}); run again with a higher --max-usd, or --yes`;
            break;
          }
          const taken = await db.query(
            `insert into public.api_usage_daily (provider, day, units)
             select 'google_tts', (now() at time zone 'utc')::date, $1::bigint
              where $1::bigint <= $2::bigint
             on conflict (provider, day) do update
               set units = public.api_usage_daily.units + excluded.units, updated_at = now()
               where public.api_usage_daily.units + excluded.units <= $2::bigint
             returning units`,
            [chars, dailyCharLimit],
          );
          if (taken.rowCount === 0) {
            stopReason =
              `today's Google TTS limit is reached (${dailyCharLimit} chars, ` +
              'GOOGLE_TTS_DAILY_CHAR_LIMIT); run again tomorrow (UTC)';
            break;
          }
          spentChars += chars;
        }
        ttsChars += chars;
        if (args.dryRun) {
          console.log(`  + ${label}: would synthesize ${chars} chars → ${keyFor('m4a')} (+ .wav)`);
          continue;
        }
        const s = await synthesizeGoogle(apiKey, tokens, accent, voices[accent], speakingRate);
        const timings: SpeakingTimings = {
          ...timingsFor(
            s,
            tokens,
            targetIndex,
            targetIpaFor(w.word, accent === 'UK' ? (w.ipa_uk ?? w.ipa_us) : (w.ipa_us ?? w.ipa_uk)),
          ),
          speaking_rate: speakingRate,
        };
        const meta = { CacheControl: 'public, max-age=31536000, immutable' };
        // AAC .m4a (what the API links) + the WAV copy at the same key
        // (KEEP_WAV_COPY); WAV only if ffmpeg is missing.
        const audio = await encodeForWeb(s.wav);
        if (audio.fallback) console.log(`  ! ${label}: no AAC, WAV only (${audio.fallback})`);
        const files = filesToStore(audio, keyFor);
        for (const file of files) {
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: file.key,
              Body: file.body,
              ContentType: file.contentType,
              ...meta,
            }),
          );
        }
        key = files[0].key;
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: jsonKey,
            Body: JSON.stringify(timings),
            ContentType: 'application/json',
            ...meta,
          }),
        );
        console.log(`  + ${label}: ${key} (${timings.duration}s)`);
        result[accent] = { key, timings };
        made++;
      }
      if (!args.dryRun && (result.UK || result.US)) {
        await db.query(
          `insert into public.speaking_items
             (lexicon_id, sentence, target_index, audio_uk_path, timings_uk, audio_us_path, timings_us)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (lexicon_id) do update set
             sentence = excluded.sentence,
             target_index = excluded.target_index,
             -- Keep the other accent only if it was made for this same sentence.
             audio_uk_path = case when speaking_items.sentence = excluded.sentence
               then coalesce(excluded.audio_uk_path, speaking_items.audio_uk_path)
               else excluded.audio_uk_path end,
             timings_uk = case when speaking_items.sentence = excluded.sentence
               then coalesce(excluded.timings_uk, speaking_items.timings_uk)
               else excluded.timings_uk end,
             audio_us_path = case when speaking_items.sentence = excluded.sentence
               then coalesce(excluded.audio_us_path, speaking_items.audio_us_path)
               else excluded.audio_us_path end,
             timings_us = case when speaking_items.sentence = excluded.sentence
               then coalesce(excluded.timings_us, speaking_items.timings_us)
               else excluded.timings_us end`,
          [
            w.lexicon_id,
            sentence,
            targetIndex,
            result.UK?.key ?? null,
            result.UK ? JSON.stringify(result.UK.timings) : null,
            result.US?.key ?? null,
            result.US ? JSON.stringify(result.US.timings) : null,
          ],
        );
      }
      if (stopReason) break;
    }
    await db.query(args.dryRun ? 'rollback' : 'commit');
  } catch (err) {
    await db.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    await db.end();
  }
  const verb = args.dryRun ? 'would cost' : 'cost';
  console.log(
    `Done: ${made} made, ${reused} reused, ${skipped} skipped. TTS ${ttsChars} chars ` +
      `(SSML incl. marks) ${verb} ≈ $${(ttsChars * PRICE_PER_CHAR).toFixed(4)} at Neural2 list price ` +
      '(the first 1M chars a month are free).',
  );
  if (stopReason) {
    console.log(`Stopped early: ${stopReason}. What was made is kept; run again to continue.`);
  } else if (args.dryRun && !args.yes && ttsChars * PRICE_PER_CHAR > args.maxUsd) {
    console.log(
      `Note: a real run stops at --max-usd $${args.maxUsd}; add --max-usd or --yes to do it all.`,
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.fixture) await runFixture(args);
  else await runTopic(args, loadEnv());
}

main().catch((err: Error) => {
  console.error(`speaking-generate: ${err.message}`);
  process.exit(1);
});
