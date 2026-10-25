#!/usr/bin/env ts-node
/**
 * scoring-tune — pronunciation v2: measure a "wrong vowel" rule against labelled takes.
 * See docs/reports/pron-v2 scoring tune.md and src/modules/speaking/vowel-check.ts.
 *
 *   npm run scoring-tune -- synth --out DIR [--words 40]
 *       Synthetic takes (Google TTS, two voices that aren't the native one): each library word said
 *       right, and with its stressed vowel swapped for a usual learner confusion. DIR/synth.jsonl
 *       labels them. Costs about 15k TTS characters.
 *   npm run scoring-tune -- score --synth DIR [--scorer http://127.0.0.1:8099]
 *   npm run scoring-tune -- score --dataset DIR [--scorer …]
 *       Scores the takes on the speech server's tuning build (per-phone `top`, `top_p`, `gop`)
 *       and prints totals only. --dataset reads a com.dydoacademy.gopt export (manifest.jsonl,
 *       audio/, labels/<teacher>/<utt>.json: 0 wrong / 1 accented / 2 right per phone). It prints
 *       no word, learner or file: only counts, so its output can be shared.
 *
 * Env: the root .env (DATABASE_URL, GOOGLE_TTS_API_KEY). Read-only on the database.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { Client } from 'pg';

import { PRON } from '../src/modules/speaking/pron-config';
import { ipaUnits, type StoredSyllable } from '../src/modules/speaking/pron-syllables';
import { syllabify, toScorerWordResult, type PronunciationReply } from '../src/modules/speaking/pronunciation-word';
import {
  applyVowelCheck,
  vowelVerdict,
  type VowelCheckOptions,
  type VowelVerdict,
} from '../src/modules/speaking/vowel-check';

const VOWELS = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW']);

/** A learner's usual swap for each IPA vowel (Vietnamese learners first). */
const CONFUSION: [string, string][] = [
  ['eɪ', 'æ'], ['aɪ', 'iː'], ['oʊ', 'ɔː'], ['aʊ', 'oʊ'], ['əʊ', 'ɔː'],
  ['iː', 'ɪ'], ['ɑː', 'ʌ'], ['ɔː', 'oʊ'], ['uː', 'ʊ'], ['ɜː', 'ɑː'],
  ['ɝ', 'ɑː'], ['ɪ', 'aɪ'], ['i', 'aɪ'], ['ɛ', 'æ'], ['e', 'æ'],
  ['æ', 'ɛ'], ['ʌ', 'ɑː'], ['ɑ', 'ʌ'], ['ɔ', 'oʊ'], ['ʊ', 'uː'], ['ə', 'æ'],
];

/** The IPA with its stressed vowel swapped (null when there's none to swap). */
export function swapStressedVowel(ipa: string): string | null {
  const core = ipa.replace(/^[/[]+|[/\]]+$/g, '').split(/[,;]/)[0].trim();
  const at = core.indexOf('ˈ');
  if (at < 0) return null;
  for (let i = at + 1; i < core.length; i++) {
    for (const [from, to] of CONFUSION) {
      if (core.startsWith(from, i)) return core.slice(0, i) + to + core.slice(i + from.length);
    }
    if ('.ˌ'.includes(core[i])) return null;
  }
  return null;
}

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const f of ['../.env', '.env']) {
    const file = path.resolve(__dirname, '..', f);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  for (const k of ['DATABASE_URL', 'GOOGLE_TTS_API_KEY']) if (process.env[k]) env[k] = process.env[k]!;
  return env;
}

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};

async function db<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: loadEnv().DATABASE_URL });
  await c.connect();
  try {
    await c.query('set role service_role');
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}

function wav(pcm: Buffer, rate = 16000): Buffer {
  const pad = (s: number) => Buffer.alloc(Math.round(s * rate) * 2);
  const data = Buffer.concat([pad(0.5), pcm, pad(0.8)]);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

/** Wrong stress: the primary stress mark moved to the next syllable (null when there's none). */
export function moveStress(ipa: string): string | null {
  const core = ipa.replace(/^[/[]+|[/\]]+$/g, '').split(/[,;]/)[0].trim().replace(/ˌ/g, '');
  const parts = core.replace(/ˈ/g, '.ˈ').split('.').filter(Boolean);
  const k = parts.findIndex((x) => x.startsWith('ˈ'));
  if (k < 0 || parts.length < 2) return null;
  const to = k + 1 < parts.length ? k + 1 : k - 1;
  parts[k] = parts[k].slice(1);
  parts[to] = 'ˈ' + parts[to];
  return parts.join('');
}

/** A dropped final consonant (null when the word ends in a vowel). */
export function dropFinal(ipa: string): string | null {
  const core = ipa.replace(/^[/[]+|[/\]]+$/g, '').split(/[,;]/)[0].trim();
  const last = core.at(-1) ?? '';
  return /[bdfɡkmnŋpstvzθðʃʒlɹr]/.test(last) ? core.slice(0, -1) : null;
}

const VOICES = [
  { name: 'en-US-Neural2-D', lang: 'en-US', ipa: 'ipa_us' },
  { name: 'en-US-Neural2-J', lang: 'en-US', ipa: 'ipa_us' },
  { name: 'en-GB-Neural2-B', lang: 'en-GB', ipa: 'ipa_uk' },
] as const;

async function synth(out: string, n: number) {
  const key = loadEnv().GOOGLE_TTS_API_KEY;
  if (!key) throw new Error('GOOGLE_TTS_API_KEY missing');
  fs.mkdirSync(out, { recursive: true });
  const words = await db<{ normalized_word: string; ipa_us: string; ipa_uk: string | null }>(
    `select ml.normalized_word, ml.ipa_us, coalesce(ml.ipa_uk, ml.ipa_us) as ipa_uk from public.master_lexicon ml
      where ml.syllables_us is not null and jsonb_array_length(ml.syllables_us) between 2 and 4
        and ml.ipa_us like '%ˈ%' and ml.normalized_word ~ '^[a-z]+$'
        and (ml.normalized_word in ('mitigate', 'compensation') or exists (
              select 1 from public.topic_words tw join public.topics t on t.id = tw.topic_id
                join public.groups g on g.id = t.group_id where tw.lexicon_id = ml.id and g.is_public))
      order by ml.normalized_word in ('mitigate', 'compensation') desc, md5(ml.normalized_word) limit $1`,
    [n],
  );
  const clean = (ipa: string) => ipa.replace(/^[/[]+|[/\]]+$/g, '').split(/[,;]/)[0].trim();
  const rows: string[] = [];
  for (const w of words) {
    for (const v of VOICES) {
      const ipa = clean(w[v.ipa] ?? w.ipa_us);
      const takes: [string, string | null, number][] = [
        ['right', ipa, 1],
        ['right-slow', ipa, 0.85],
        ['vowel', swapStressedVowel(ipa), 1],
        ['stress', moveStress(ipa), 1],
        ['drop', dropFinal(ipa), 1],
      ];
      for (const [kind, said, rate] of takes) {
        if (!said) continue;
        const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            input: { ssml: `<speak><phoneme alphabet="ipa" ph="${said.replace(/\./g, '')}">${w.normalized_word}</phoneme></speak>` },
            voice: { languageCode: v.lang, name: v.name },
            audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 16000, speakingRate: rate },
          }),
        });
        const body = (await res.json()) as { audioContent?: string };
        if (!res.ok || !body.audioContent) continue;
        const file = `${w.normalized_word}-${v.name.slice(-1)}-${kind}.wav`;
        fs.writeFileSync(path.join(out, file), wav(Buffer.from(body.audioContent, 'base64').subarray(44)));
        const stressed = ipaUnits(ipa).findIndex((u) => u.stressed);
        rows.push(JSON.stringify({ file, word: w.normalized_word, kind, voice: v.name, said, stressedVowel: stressed }));
      }
    }
  }
  fs.writeFileSync(path.join(out, 'synth.jsonl'), rows.join('\n') + '\n');
  console.log(`synth: ${rows.length} takes for ${words.length} words in ${out}`);
}

interface Take {
  word: string;
  /** Per phone of the word: 0 wrong, 1 accented, 2 right (null: not labelled). */
  labels: (0 | 1 | 2)[] | null;
  wavPath: string;
  /** Synthetic: right, right-slow, vowel (one wrong vowel), stress (wrong stress), drop (no final consonant). */
  kind?: string;
}

function synthTakes(dir: string): Take[] {
  return fs
    .readFileSync(path.join(dir, 'synth.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { file: string; word: string; kind: string; stressedVowel: number })
    .map((r) => ({ word: r.word, labels: null, wavPath: path.join(dir, r.file), kind: r.kind, stressedVowel: r.stressedVowel }) as Take & { stressedVowel: number });
}

function datasetTakes(dir: string): Take[] {
  const manifest = fs
    .readFileSync(path.join(dir, 'manifest.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { utt_id: string; kind: string; text: string; audio: string; words: { phones: string[] }[] });
  const labelDir = path.join(dir, 'labels');
  const labels = new Map<string, { words?: { phones: (0 | 1 | 2)[] }[]; unusable?: boolean }>();
  for (const rater of fs.existsSync(labelDir) ? fs.readdirSync(labelDir) : []) {
    for (const f of fs.readdirSync(path.join(labelDir, rater))) {
      if (!f.endsWith('.json')) continue;
      const l = JSON.parse(fs.readFileSync(path.join(labelDir, rater, f), 'utf8'));
      if (!labels.has(l.utt_id)) labels.set(l.utt_id, l); // first teacher's marks
    }
  }
  return manifest
    .filter((m) => m.kind === 'word' && labels.get(m.utt_id)?.words && !labels.get(m.utt_id)?.unusable)
    .map((m) => ({ word: m.text.trim().toLowerCase(), labels: labels.get(m.utt_id)!.words![0].phones, wavPath: path.join(dir, m.audio) }));
}

const GRID: VowelCheckOptions[] = (['family', 'confusion'] as const).flatMap((mode) =>
  [0.3, 0.4, 0.5, 0.6].flatMap((wrongP) => [0.2, 0.3].map((closeP) => ({ mode, wrongP, closeP }))),
);
/** The candidate rules compared on whole takes. */
const RULES: [string, VowelCheckOptions][] = [
  ['family 0.3/0.2', { mode: 'family', wrongP: 0.3, closeP: 0.2 }],
  ['confusion 0.4/0.25', { mode: 'confusion', wrongP: 0.4, closeP: 0.25 }],
  ['confusion 0.5/0.3', { mode: 'confusion', wrongP: 0.5, closeP: 0.3 }],
  ['confusion 0.6/0.35', { mode: 'confusion', wrongP: 0.6, closeP: 0.35 }],
];

async function score(takes: (Take & { stressedVowel?: number })[], scorer: string) {
  const stones = new Map<string, { ipa: string; st: StoredSyllable[] }>();
  for (const r of await db<{ normalized_word: string; ipa_us: string; syllables_us: StoredSyllable[] }>(
    `select normalized_word, ipa_us, syllables_us from public.master_lexicon where normalized_word = any($1) and syllables_us is not null`,
    [[...new Set(takes.map((t) => t.word))]],
  ))
    stones.set(r.normalized_word, { ipa: r.ipa_us, st: r.syllables_us });

  // Per vowel: [label] → counts of verdicts per grid point; and phone score buckets.
  const perVowel = GRID.map(() => ({ wrong: { wrong: 0, unsure: 0, ok: 0 }, accented: { wrong: 0, unsure: 0, ok: 0 }, right: { wrong: 0, unsure: 0, ok: 0 } }));
  const scoreLines = [60, 70, 80, 90].map((t) => ({ t, wrong: 0, accented: 0, right: 0, nWrong: 0, nAcc: 0, nRight: 0 }));
  const outcomes: Record<string, Record<string, number>> = {};
  const bump = (k: string, o: string) => ((outcomes[k] ??= {})[o] = ((outcomes[k] ??= {})[o] ?? 0) + 1);
  let skipped = 0;
  const pairs = new Map<string, number>();

  for (const take of takes) {
    const form = new FormData();
    form.append('audio', new Blob([fs.readFileSync(take.wavPath)], { type: 'audio/wav' }), 'take.wav');
    form.append('sentence', take.word);
    const raw = (await (await fetch(`${scorer}/check-pronunciation`, { method: 'POST', body: form })).json()) as PronunciationReply;
    const phones = (raw.words[0]?.phones ?? []) as { phone: string; score: number; top?: string; top_p?: number }[];
    const vowelIdx = phones.flatMap((p, i) => (VOWELS.has(p.phone) ? [i] : []));
    // Labels per phone: the dataset's, or for a synthetic take the stressed vowel wrong in a wrong take.
    let labels: (0 | 1 | 2)[] | null = take.labels && take.labels.length === phones.length ? take.labels : null;
    if (!take.labels && take.kind) {
      labels = phones.map(() => 2 as const);
      if (take.kind === 'vowel') {
        const k = take.stressedVowel ?? -1;
        if (k < 0 || k >= vowelIdx.length || ipaUnits(stones.get(take.word)?.ipa).length !== vowelIdx.length) labels = null;
        else labels[vowelIdx[k]] = 0;
      } else if (take.kind === 'drop' && phones.length && !VOWELS.has(phones[phones.length - 1].phone)) {
        labels[phones.length - 1] = 0;
      }
    }
    if (!labels) {
      skipped += 1;
      continue;
    }
    for (const i of vowelIdx) {
      const lab = labels[i] === 0 ? 'wrong' : labels[i] === 1 ? 'accented' : 'right';
      const v0 = vowelVerdict(phones[i]);
      if (process.env.TUNE_PAIRS && ((lab === 'right' && v0 === 'wrong') || (lab === 'wrong' && v0 !== 'wrong'))) {
        const k = `${lab === 'right' ? 'false alarm' : 'missed'} ${phones[i].phone}→${phones[i].top}`;
        pairs.set(k, (pairs.get(k) ?? 0) + 1);
      }
      GRID.forEach((g, gi) => {
        const v = vowelVerdict(phones[i], g);
        if (v !== 'n/a') perVowel[gi][lab][v] += 1;
      });
      for (const s of scoreLines) {
        if (lab === 'wrong') { s.nWrong += 1; if (phones[i].score < s.t) s.wrong += 1; }
        else if (lab === 'accented') { s.nAcc += 1; if (phones[i].score < s.t) s.accented += 1; }
        else { s.nRight += 1; if (phones[i].score < s.t) s.right += 1; }
      }
    }
    // The P4 outcome now and with the draft rule (default thresholds).
    const kind = take.kind ?? (labels.includes(0) ? 'has a wrong sound' : labels.includes(1) ? 'accented' : 'all right');
    const st = stones.get(take.word);
    if (!st) continue;
    let now: string;
    let draft = '';
    try {
      const r = toScorerWordResult(raw, take.word, st.ipa, st.st);
      const outcome = (total: number, scores: number[]) => {
        if (r.status !== 'ok') return r.status;
        const almost = scores.some((s) => s < PRON.cleanAtLeast);
        return total >= PRON.passAtLeast ? (almost ? 'almost' : 'pass') : 'retry';
      };
      now = outcome(r.total, r.syllables.map((s) => s.score));
      const groups = st.st.length === 1 ? [phones.map((p) => p.phone)] : syllabify(phones.map((p) => p.phone));
      let at = 0;
      const vowelsOf = r.syllables.map((_, k) => {
        const own = phones.slice(at, at + groups[k].length);
        at += groups[k].length;
        return own;
      });
      const sylls = r.syllables.map((s) => ({ score: s.score, vowels: [] as VowelVerdict[] }));
      for (const [name, opts] of RULES) {
        const tuned = applyVowelCheck(
          sylls.map((sy, k) => ({ ...sy, vowels: vowelsOf[k].map((p) => vowelVerdict(p, opts)).filter((v) => v !== 'n/a') })),
          r.total,
        );
        bump(`${name} · ${kind}`, outcome(tuned.total, tuned.scores));
      }
      draft = '';
    } catch {
      now = draft = 'scoring error';
      for (const [name] of RULES) bump(`${name} · ${kind}`, now);
    }
    bump(`now · ${kind}`, now);
  }

  if (process.env.TUNE_PAIRS) console.log([...pairs].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join('\n') + '\n');
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '-');
  console.log(`takes: ${takes.length} (skipped ${skipped}: phones didn't line up with the labels)\n`);
  console.log('Vowel rule grid: of the vowels marked wrong / accented / right, how many the rule calls wrong (unsure)');
  console.log('mode      wrongP closeP | wrong: wrong (close) | accented: wrong (close) | right: wrong (close)');
  GRID.forEach((g, gi) => {
    const v = perVowel[gi];
    const n = (o: { wrong: number; unsure: number; ok: number }) => o.wrong + o.unsure + o.ok;
    console.log(
      `${g.mode.padEnd(9)} ${g.wrongP.toFixed(2)}   ${g.closeP.toFixed(2)}  | ${pct(v.wrong.wrong, n(v.wrong))} (${pct(v.wrong.unsure, n(v.wrong))}) of ${n(v.wrong)} | ${pct(v.accented.wrong, n(v.accented))} (${pct(v.accented.unsure, n(v.accented))}) of ${n(v.accented)} | ${pct(v.right.wrong, n(v.right))} (${pct(v.right.unsure, n(v.right))}) of ${n(v.right)}`,
    );
  });
  console.log('\nGOPT phone score under the line, for comparison (vowels):');
  for (const s of scoreLines) console.log(`< ${s.t}: wrong ${pct(s.wrong, s.nWrong)}, accented ${pct(s.accented, s.nAcc)}, right ${pct(s.right, s.nRight)}`);
  console.log('\nP4 outcome per take: now, and with each candidate rule');
  for (const [k, v] of Object.entries(outcomes).sort()) console.log(`${k}: ${Object.entries(v).map(([o, c]) => `${o} ${c}`).join(', ')}`);
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'synth') return synth(arg('out') ?? '', Number(arg('words', '40')));
  if (mode === 'score') {
    const scorer = arg('scorer', 'http://127.0.0.1:8099')!;
    const takes = arg('synth') ? synthTakes(arg('synth')!) : arg('dataset') ? datasetTakes(arg('dataset')!) : [];
    if (takes.length === 0) throw new Error('no takes: --synth DIR or --dataset DIR');
    return score(takes, scorer);
  }
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 20).join('\n'));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
