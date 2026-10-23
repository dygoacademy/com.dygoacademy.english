#!/usr/bin/env node
/**
 * relations-import — load related words (Seeds & Harvest Phase 2) from a CSV
 * into word_relations.
 *
 *   npm run relations-import -- path/to/relations.csv              # uses ../.env
 *   npm run relations-import:prod -- path/to/relations.csv         # uses ../env-profiles/prod.env
 *   npm run relations-import -- relations.csv --dry-run            # check the file, write nothing
 *
 * CSV columns (header row required): word, related, kind, rank, reviewed
 *   word      a word already in master_lexicon (its normalized spelling)
 *   related   the word or phrase it drops, e.g. "mitigate the risk"
 *   kind      pairing | family | synonym
 *   rank      1 = first within its kind (optional, default 1)
 *   reviewed  yes = an editor checked it (optional). Only reviewed rows ever
 *             drop as seeds; re-import with "yes" once checked. A blank
 *             value never clears an earlier review.
 *
 * A row whose `word` isn't in master_lexicon is reported and skipped. The
 * related word doesn't need to exist yet: when a seed drops, it is added to
 * the learner's My words and enriched like any word they add.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const KINDS = new Set(['pairing', 'family', 'synonym']);

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
  if (process.env.DATABASE_URL !== undefined) env.DATABASE_URL = process.env.DATABASE_URL;
  return env;
}

/** Minimal CSV: commas, optional double quotes ("" inside quotes = a quote). */
function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') {
        cells.push(cell);
        cell = '';
      } else cell += ch;
    }
    cells.push(cell);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

function readRows(file) {
  const [header, ...body] = parseCsv(fs.readFileSync(file, 'utf8'));
  const col = (name) => header.map((h) => h.toLowerCase()).indexOf(name);
  const at = {
    word: col('word'),
    related: col('related'),
    kind: col('kind'),
    rank: col('rank'),
    reviewed: col('reviewed'),
  };
  if (at.word < 0 || at.related < 0 || at.kind < 0) {
    throw new Error('The CSV needs a header row with at least: word, related, kind');
  }
  const rows = [];
  const problems = [];
  body.forEach((cells, i) => {
    const line = i + 2;
    const word = (cells[at.word] || '').toLowerCase();
    const related = cells[at.related] || '';
    const kind = (cells[at.kind] || '').toLowerCase();
    const rank = at.rank >= 0 && cells[at.rank] ? Number(cells[at.rank]) : 1;
    const reviewed = at.reviewed >= 0 && /^(y|yes|true|1)$/i.test(cells[at.reviewed] || '');
    if (!word || !related) problems.push(`line ${line}: word and related are required`);
    else if (!KINDS.has(kind))
      problems.push(`line ${line}: kind must be pairing, family or synonym`);
    else if (!Number.isInteger(rank) || rank < 1)
      problems.push(`line ${line}: rank must be 1 or more`);
    else rows.push({ line, word, related, kind, rank, reviewed });
  });
  return { rows, problems };
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  if (!file) {
    console.error('usage: relations-import <file.csv> [--dry-run]');
    process.exit(1);
  }
  const { rows, problems } = readRows(file);
  problems.forEach((p) => console.warn(`skip ${p}`));

  const env = loadEnv();
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set (../.env or the environment)');
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  let written = 0;
  let missing = 0;
  try {
    // word_relations is written by service_role only (see audio-backfill.js
    // for why DATABASE_URL's own role needs this).
    await db.query('set role service_role');
    await db.query('begin');
    for (const r of rows) {
      const lexicon = await db.query(
        `select id from public.master_lexicon where normalized_word = $1 and language_code = 'en'`,
        [r.word],
      );
      if (!lexicon.rows[0]) {
        missing++;
        console.warn(`skip line ${r.line}: "${r.word}" is not in master_lexicon`);
        continue;
      }
      await db.query(
        `insert into public.word_relations (lexicon_id, related_word, kind, rank, reviewed_at)
         values ($1, $2, $3, $4, case when $5 then now() end)
         on conflict (lexicon_id, related_word) do update
           set kind = excluded.kind,
               rank = excluded.rank,
               reviewed_at = coalesce(public.word_relations.reviewed_at, excluded.reviewed_at)`,
        [lexicon.rows[0].id, r.related, r.kind, r.rank, r.reviewed],
      );
      written++;
    }
    await db.query(dryRun ? 'rollback' : 'commit');
  } catch (err) {
    await db.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    await db.end();
  }
  console.log(
    `${dryRun ? '[dry run] would write' : 'wrote'} ${written} relations` +
      ` (${missing} words not in the lexicon, ${problems.length} bad lines)`,
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
