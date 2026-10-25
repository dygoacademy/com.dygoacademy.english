#!/usr/bin/env node
/**
 * us-ipa-fix — give library words whose ipa_us is a copy of ipa_uk a real
 * General American IPA (2026-10-25).
 *
 *   node scripts/us-ipa-fix.js --out ../database/content/us_ipa_fix.csv   # propose, write nothing to the DB
 *   node scripts/us-ipa-fix.js --apply ../database/content/us_ipa_fix.csv # write the CSV's changed rows
 *
 * Why: enrichment used to return the British IPA in both fields for many
 * words ("inevitable" /ɪˈnev.ɪ.tə.bəl/ in both), so the US clip was said
 * from British sounds. Propose asks Gemini, in batches, for the US IPA of
 * each library word (a word in a public group's beds) whose two IPAs match
 * once slashes and spaces are dropped, with the UK one as context, and
 * writes word, ipa_uk, old_ipa_us, new_ipa_us for review. A word Gemini
 * says is the same in both accents keeps its IPA (new = old).
 *
 * Apply updates master_lexicon.ipa_us for the rows whose new IPA differs
 * and is well formed (between slashes, has a vowel), then the US clips are
 * remade with `npm run audio-backfill -- --word <w> ...` (printed at the
 * end). Uses DATABASE_URL and GEMINI_API_KEY from ../.env.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MODEL = 'gemini-3.5-flash-lite'; // enrichment's TEXT_MODEL
const BATCH = 25;
const VOWEL = /[aeiouæɑɒɔəɚɛɜɝɪʊʌiuɐ]/;

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
  for (const key of ['DATABASE_URL', 'GEMINI_API_KEY']) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return env;
}

const norm = (ipa) => (ipa ?? '').replace(/[/\s]/g, '');

/** A US IPA we are willing to store: /…/, a vowel, no stray characters. */
function wellFormed(ipa) {
  return /^\/[^/,;"<>&]+\/$/.test(ipa) && VOWEL.test(ipa);
}

function csvCell(s) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsv(text) {
  const rows = [];
  for (const line of text.split('\n').slice(1)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') (cur += '"'), i++;
        else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') cells.push(cur), (cur = '');
      else cur += c;
    }
    cells.push(cur);
    rows.push({ word: cells[0], ipa_uk: cells[1], old_ipa_us: cells[2], new_ipa_us: cells[3] });
  }
  return rows;
}

const PROMPT = [
  'You are a pronunciation editor for a learner dictionary in the style of the Cambridge Dictionary.',
  'For each word below you get its British (Received Pronunciation) IPA. Give its General American IPA.',
  'Use Cambridge conventions: slashes, ˈ primary and ˌ secondary stress, syllable dots, ə for unstressed',
  'vowels, ɚ for unstressed r-coloured schwa and ɝ for stressed, the flapped t written t̬ (e.g. "water"',
  '/ˈwɑː.t̬ɚ/), rhotic r after vowels (ɑːr, ɔːr, er, ɪr, ʊr), æ in bath words, ɑː for British ɒ, oʊ for əʊ.',
  'Example: inevitable UK /ɪˈnev.ɪ.tə.bəl/ → US /ˌɪnˈev.ə.t̬ə.bəl/.',
  'If the word is genuinely pronounced the same in both accents, return the British IPA unchanged.',
  'Return one entry per word, same spelling, nothing else.',
].join('\n');

async function propose(db, env, out) {
  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const { rows } = await db.query(
    `select ml.normalized_word as word, ml.ipa_uk, ml.ipa_us
       from public.master_lexicon ml
      where exists (select 1 from public.topic_words tw
                      join public.topics t on t.id = tw.topic_id
                      join public.groups g on g.id = t.group_id
                     where tw.lexicon_id = ml.id and g.is_public)
        and ml.ipa_uk is not null
        and regexp_replace(ml.ipa_us, '[/ ]', '', 'g') = regexp_replace(ml.ipa_uk, '[/ ]', '', 'g')
      order by ml.normalized_word`,
  );
  console.log(`us-ipa-fix: ${rows.length} library word(s) with ipa_us = ipa_uk`);

  const proposed = new Map();
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `${PROMPT}\n\n${batch.map((r) => `${r.word}\tUK ${r.ipa_uk}`).join('\n')}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { word: { type: Type.STRING }, ipa_us: { type: Type.STRING } },
            required: ['word', 'ipa_us'],
          },
        },
      },
    });
    for (const e of JSON.parse(res.text ?? '[]')) proposed.set(e.word.trim().toLowerCase(), e.ipa_us.trim());
    console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  const lines = ['word,ipa_uk,old_ipa_us,new_ipa_us'];
  let changed = 0;
  let rejected = 0;
  for (const r of rows) {
    let next = proposed.get(r.word) ?? r.ipa_us;
    if (!next.startsWith('/')) next = `/${next.replace(/^\/|\/$/g, '')}/`;
    if (!wellFormed(next)) {
      console.log(`  ! ${r.word}: "${next}" is malformed, kept ${r.ipa_us}`);
      rejected++;
      next = r.ipa_us;
    }
    if (norm(next) !== norm(r.ipa_us)) changed++;
    lines.push([r.word, r.ipa_uk, r.ipa_us, next].map(csvCell).join(','));
  }
  fs.writeFileSync(out, `${lines.join('\n')}\n`);
  console.log(`us-ipa-fix: ${changed} would change, ${rows.length - changed} stay; ${rejected} rejected. Wrote ${out}`);
}

async function apply(db, file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8')).filter(
    (r) => norm(r.new_ipa_us) !== norm(r.old_ipa_us) && wellFormed(r.new_ipa_us),
  );
  await db.query('begin');
  let updated = 0;
  for (const r of rows) {
    // Only where the row still holds the IPA the CSV was made from.
    const res = await db.query(
      `update public.master_lexicon set ipa_us = $2, updated_at = now()
        where normalized_word = $1 and ipa_us = $3`,
      [r.word, r.new_ipa_us, r.old_ipa_us],
    );
    updated += res.rowCount;
  }
  await db.query('commit');
  console.log(`us-ipa-fix: updated ipa_us of ${updated} word(s). Remake their US clips with:`);
  console.log(`  npm run audio-backfill -- ${rows.map((r) => `--word ${JSON.stringify(r.word)}`).join(' ')}`);
}

async function main() {
  const args = process.argv.slice(2);
  const env = loadEnv();
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('set role service_role');
    if (args[0] === '--out' && args[1]) await propose(db, env, args[1]);
    else if (args[0] === '--apply' && args[1]) await apply(db, args[1]);
    else {
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 8).join('\n'));
      process.exitCode = 1;
    }
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(`us-ipa-fix failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
