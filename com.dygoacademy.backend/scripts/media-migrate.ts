#!/usr/bin/env ts-node
/**
 * media-migrate — one-off move of the app's media from Cloudflare R2 to
 * RustFS (media.dygoacademy.com), option 2 (2026-10-04).
 *
 *   npm run media-migrate -- --dry-run      # what would be copied / rewritten
 *   npm run media-migrate                   # copy, then rewrite the URLs
 *   npm run media-migrate -- --copy-only    # copy files, leave the database alone
 *   npm run media-migrate -- --revert       # point master_lexicon.audio_url back at R2
 *
 * 1. Copy: every object under `audio/` and `speaking/` in R2 goes to the
 *    RustFS bucket at the same key. A `.wav` is also encoded to AAC `.m4a`
 *    (same key, ffmpeg), so RustFS ends up with both, like new uploads.
 *    Objects already in RustFS are skipped (--force re-copies).
 * 2. Rewrite: `master_lexicon.audio_url` values on the R2 host become
 *    `https://media.dygoacademy.com/<key>.m4a` (or `.wav` if there's no
 *    m4a), but only when that file is really in RustFS. Runs as
 *    service_role in one transaction. Safe to re-run; --revert undoes it.
 *
 * R2 is read only; nothing is deleted there. Env: DATABASE_URL, R2_*,
 * RUSTFS_* (root .env).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Client } from 'pg';

import { StorageConfig, storageConfigFrom } from '../src/config/storage-config';
import { CONTENT_TYPES, encodeForWeb, filesToStore } from '../src/storage/audio-encode';

const PREFIXES = ['audio/', 'speaking/'];
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

interface Args {
  dryRun: boolean;
  copyOnly: boolean;
  revert: boolean;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, copyOnly: false, revert: false, force: false };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--copy-only') args.copyOnly = true;
    else if (a === '--revert') args.revert = true;
    else if (a === '--force') args.force = true;
    else if (a === '--help' || a === '-h') {
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 10).join('\n'));
      process.exit(0);
    } else throw new Error(`unknown option ${a} (see --help)`);
  }
  return args;
}

/** ../.env then .env, shell variables winning (as the other scripts). */
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

function clientFor(c: StorageConfig): S3Client {
  return new S3Client({
    endpoint: c.endpoint,
    region: c.region,
    forcePathStyle: c.forcePathStyle,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
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

async function listKeys(s3: S3Client, bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const o of page.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

const contentTypeFor = (key: string) =>
  key.endsWith('.m4a')
    ? CONTENT_TYPES.m4a
    : key.endsWith('.wav')
      ? CONTENT_TYPES.wav
      : key.endsWith('.json')
        ? 'application/json'
        : key.endsWith('.mp3')
          ? 'audio/mpeg'
          : 'application/octet-stream';

async function copyAll(
  r2c: StorageConfig,
  dst: StorageConfig,
  args: Args,
): Promise<{ seen: number; copied: number; skipped: number; encoded: number }> {
  const r2 = clientFor(r2c);
  const rf = clientFor(dst);
  const stats = { seen: 0, copied: 0, skipped: 0, encoded: 0 };
  for (const prefix of PREFIXES) {
    const keys = await listKeys(r2, r2c.bucket, prefix);
    console.log(`R2 ${prefix}: ${keys.length} object(s)`);
    for (const key of keys) {
      stats.seen++;
      const isWav = key.endsWith('.wav');
      const m4aKey = key.replace(/\.wav$/, '.m4a');
      const done =
        (await exists(rf, dst.bucket, key)) && (!isWav || (await exists(rf, dst.bucket, m4aKey)));
      if (done && !args.force) {
        stats.skipped++;
        continue;
      }
      if (args.dryRun) {
        console.log(`  + would copy ${key}${isWav ? ' (+ .m4a)' : ''}`);
        stats.copied++;
        continue;
      }
      const obj = await r2.send(new GetObjectCommand({ Bucket: r2c.bucket, Key: key }));
      const body = Buffer.from(await obj.Body!.transformToByteArray());
      const files = isWav
        ? filesToStore(await encodeForWeb(body), (ext) => key.replace(/\.wav$/, `.${ext}`))
        : [{ key, body, contentType: contentTypeFor(key) }];
      if (isWav && files[0].key.endsWith('.m4a')) stats.encoded++;
      for (const f of files) {
        await rf.send(
          new PutObjectCommand({
            Bucket: dst.bucket,
            Key: f.key,
            Body: f.body,
            ContentType: f.contentType,
            CacheControl: CACHE_CONTROL,
          }),
        );
      }
      stats.copied++;
      if (stats.copied % 50 === 0) console.log(`  … ${stats.copied} copied`);
    }
  }
  return stats;
}

/** `https://<r2 host>/audio/en/us/<md5>.wav` → `audio/en/us/<md5>`, else null. */
export function keyStemFromUrl(url: string, publicBase: string): string | null {
  const base = publicBase.replace(/\/+$/, '');
  if (!base || !url.startsWith(`${base}/`)) return null;
  const key = url.slice(base.length + 1).split('?')[0];
  const m = key.match(/^((?:audio|speaking)\/.+)\.(wav|m4a)$/);
  return m ? m[1] : null;
}

async function rewriteUrls(
  db: Client,
  from: StorageConfig,
  to: StorageConfig,
  rf: S3Client | null,
  args: Args,
): Promise<{ rows: number; rewritten: number; missing: number }> {
  const rows = await db.query<{ id: string; audio_url: string }>(
    `select id, audio_url from public.master_lexicon
      where audio_url like $1 || '/%'`,
    [from.publicUrl.replace(/\/+$/, '')],
  );
  const stats = { rows: rows.rows.length, rewritten: 0, missing: 0 };
  for (const row of rows.rows) {
    const stem = keyStemFromUrl(row.audio_url, from.publicUrl);
    if (!stem) continue;
    let target: string | null = null;
    if (rf) {
      // Forward: only point at files that are really in RustFS, m4a first.
      for (const ext of ['m4a', 'wav']) {
        if (await exists(rf, to.bucket, `${stem}.${ext}`)) {
          target = `${stem}.${ext}`;
          break;
        }
      }
    } else {
      target = `${stem}.wav`; // revert: R2 only ever had the WAV
    }
    if (!target) {
      stats.missing++;
      console.log(`  ! ${row.audio_url}: not in RustFS, left as is`);
      continue;
    }
    const url = `${to.publicUrl.replace(/\/+$/, '')}/${target}`;
    if (!args.dryRun) {
      await db.query('update public.master_lexicon set audio_url = $2 where id = $1', [
        row.id,
        url,
      ]);
    }
    stats.rewritten++;
  }
  return stats;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const r2c = storageConfigFrom({ ...env, STORAGE_PROVIDER: 'r2' });
  const rfc = storageConfigFrom({ ...env, STORAGE_PROVIDER: 'rustfs' });
  if (!r2c.publicUrl || !env.R2_ACCOUNT_ID) throw new Error('R2_* not set in .env');
  if (!rfc.accessKeyId) throw new Error('RUSTFS_ACCESS_KEY not set in .env');
  console.log(`R2 ${r2c.publicUrl} → RustFS ${rfc.publicUrl}${args.dryRun ? '  (dry run)' : ''}`);

  if (!args.revert) {
    const c = await copyAll(r2c, rfc, args);
    console.log(
      `Copy: ${c.seen} in R2, ${c.copied} ${args.dryRun ? 'to copy' : 'copied'} ` +
        `(${c.encoded} encoded to .m4a), ${c.skipped} already in RustFS.`,
    );
    if (args.copyOnly) return;
  }

  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('begin');
    await db.query("select set_config('role', 'service_role', true)");
    const r = args.revert
      ? await rewriteUrls(db, rfc, r2c, null, args)
      : await rewriteUrls(db, r2c, rfc, clientFor(rfc), args);
    await db.query(args.dryRun ? 'rollback' : 'commit');
    console.log(
      `URLs: ${r.rows} on the old host, ${r.rewritten} ${args.dryRun ? 'to rewrite' : 'rewritten'}` +
        `${r.missing ? `, ${r.missing} left (file not in RustFS)` : ''}.`,
    );
  } catch (err) {
    await db.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  main().catch((err: Error) => {
    console.error(`media-migrate: ${err.message}`);
    process.exit(1);
  });
}
