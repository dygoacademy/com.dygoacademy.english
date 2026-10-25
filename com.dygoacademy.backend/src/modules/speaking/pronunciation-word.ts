import { ipaSyllableTexts } from './speaking-timings';
import type { ScorerWordResult } from './speech-checker';

/**
 * One word through the sentence scorer. The speech server's old `/check-word`
 * is gone: a word is sent to `POST /check-pronunciation` as a one-word
 * sentence, and this turns the reply into what the Pronunciation stones show
 * (`ScorerWordResult`): the phone scores grouped into syllables, one stone
 * each, labelled with the word's IPA syllables.
 */

/** A word in the scorer's `/check-pronunciation` reply. */
export interface PronunciationWord {
  index: number;
  text: string;
  /** 0–100; null when the scorer had no phones for the word or couldn't align it. */
  score: number | null;
  status: 'ok' | 'unclear' | 'missing';
  heard: string | null;
  phones?: { phone: string; score: number }[];
}

export interface PronunciationReply {
  total: number;
  heard_text: string;
  duration_ms: number;
  /** Milliseconds of the clip that are louder than silence (absent from older scorers). */
  voiced_ms?: number;
  latency_ms: number;
  words: PronunciationWord[];
}

/**
 * A syllable under this (0–100, mean of its phone scores) wobbles, or when one phone is under
 * WRONG_PHONE_SCORE. GOPT phone scores: 70 was the best-F1 cut for "wrong or heavily accented"
 * on speechocean762 (2026-10-11); 45 for "wrong".
 */
export const WOBBLY_SCORE = 70;
export const WRONG_PHONE_SCORE = 45;
/** Less voice than this (ms) is nothing heard, whatever Whisper made of the noise. */
export const MIN_VOICED_MS = 300;
/**
 * Whisper heard another word: the take still counts only when the GOPT word score is at least this,
 * no syllable wobbles and the heard word is not shorter (see `heardOtherWord`), i.e. Whisper
 * misheard good speech. The speech server's own trust level (GOPT_HEARD_TRUST_SCORE).
 */
export const HEARD_TRUST_SCORE = 90;

const VOWELS = new Set([
  'AA',
  'AE',
  'AH',
  'AO',
  'AW',
  'AY',
  'EH',
  'ER',
  'EY',
  'IH',
  'IY',
  'OW',
  'OY',
  'UH',
  'UW',
]);
/** Consonants that can start a two-consonant onset when followed by one of ONSET_SECOND (pr, bl, tw, ...). */
const ONSET_FIRST = new Set(['P', 'B', 'T', 'D', 'K', 'G', 'F', 'TH', 'SH', 'S']);
const ONSET_SECOND = new Set(['L', 'R', 'W', 'Y']);

/**
 * Splits a word's phones into syllables, one per vowel. Between two vowels
 * the consonants go to the next syllable, except that a cluster keeps all but
 * its last consonant (or all but the last two when they can start a word,
 * "pr", "bl"): mi·ti·gate, bas·ket, pump·kin, a·pron.
 */
export function syllabify(phones: string[]): string[][] {
  const nuclei = phones.flatMap((p, i) => (VOWELS.has(p) ? [i] : []));
  if (nuclei.length === 0) return phones.length ? [phones] : [];
  const cuts: number[] = []; // index where each later syllable starts
  for (let n = 0; n < nuclei.length - 1; n++) {
    const from = nuclei[n] + 1;
    const to = nuclei[n + 1]; // the consonants between two vowels are phones[from..to)
    const len = to - from;
    const formsOnset =
      len >= 2 && ONSET_FIRST.has(phones[to - 2]) && ONSET_SECOND.has(phones[to - 1]);
    const onset = len === 0 ? 0 : formsOnset ? 2 : 1;
    cuts.push(to - onset);
  }
  const out: string[][] = [];
  let start = 0;
  for (const cut of cuts) {
    out.push(phones.slice(start, cut));
    start = cut;
  }
  out.push(phones.slice(start));
  return out;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * The scorer's reply for a one-word sentence → the stones' result.
 * `ipa` gives the stone labels; when its syllable count differs from the
 * scorer's phones (another pronunciation), one stone for the whole word, as
 * when a word has no IPA.
 */
export function toScorerWordResult(
  raw: PronunciationReply,
  word: string,
  ipa: string,
): ScorerWordResult {
  const w = raw.words[0];
  const base = {
    heard_text: raw.heard_text,
    duration_ms: raw.duration_ms,
    latency_ms: raw.latency_ms,
  };
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  if (
    !w ||
    w.status === 'missing' ||
    !raw.heard_text.trim() ||
    (raw.voiced_ms !== undefined && raw.voiced_ms < MIN_VOICED_MS)
  ) {
    return { ...base, status: 'not_heard', total: 0, syllables: [] };
  }
  const total = clamp(w.score ?? raw.total);

  const phones = w.phones ?? [];
  const groups = syllabify(phones.map((p) => p.phone));
  const labels = ipaSyllableTexts(ipa);
  const syllables =
    phones.length > 0 && groups.length === labels.length
      ? groups.map((g, i) => {
          const start = groups.slice(0, i).reduce((n, x) => n + x.length, 0);
          const scores = phones.slice(start, start + g.length).map((p) => p.score);
          const score = clamp(mean(scores));
          return {
            ipa: labels[i],
            score,
            wobbly: score < WOBBLY_SCORE || Math.min(...scores) < WRONG_PHONE_SCORE,
            heard_ipa: null,
          };
        })
      : [{ ipa: word, score: total, wobbly: total < WOBBLY_SCORE, heard_ipa: null }];
  const other = heardOtherWord(raw.heard_text, word);
  const status: ScorerWordResult['status'] =
    other !== null &&
    (other.shorter || total < HEARD_TRUST_SCORE || syllables.some((s) => s.wobbly))
      ? 'other_word'
      : 'ok';
  return { ...base, status, total, syllables };
}

/** Lower case letters, digits and inner apostrophes, UK and US spellings as one (the speech server's `canon`). */
function canon(word: string): string {
  let w = word
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9']+/g, '')
    .replace(/^'+|'+$/g, '');
  w = w.replace(/is(e|ed|es|ing|ation|ations)$/, 'iz$1');
  if (w.length > 4) w = w.replace(/our(s|ed|ing)?$/, 'or$1').replace(/tre(s)?$/, 'ter$1');
  return w;
}

/** About how many syllables a spelling has: vowel groups (y counts), a final silent e dropped. */
export function spelledSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  let n = (w.match(/[aeiouy]+/g) ?? []).length;
  if (n > 1 && /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) n -= 1;
  return Math.max(1, n);
}

/**
 * What Whisper heard (`heardText`) when it isn't the target word: null when
 * the word is in it (as spoken, or spelled the other accent's way).
 * `shorter`: the heard word has fewer syllables than the target, or is the
 * target with its start or end cut off ("cloud" for "cloudy", "migrate" for
 * "mitigate"): a part of the word was left out, whatever the sounds scored,
 * since GOPT only scores the target's own phones against the audio and can
 * stretch them over a shorter word.
 */
export function heardOtherWord(
  heardText: string,
  word: string,
): { heard: string; shorter: boolean } | null {
  const target = word
    .split(/[\s-]+/)
    .map(canon)
    .filter(Boolean);
  const heard = heardText
    .split(/[\s-]+/)
    .map(canon)
    .filter(Boolean);
  if (target.length === 0 || heard.length === 0) return null;
  const has = heard.some((_, i) => target.every((t, k) => heard[i + k] === t));
  if (has || heard.join('') === target.join('')) return null;
  const h = heard.join('');
  const t = target.join('');
  const syllables = (xs: string[]) => xs.reduce((n, x) => n + spelledSyllables(x), 0);
  return {
    heard: heard.join(' '),
    shorter:
      syllables(heard) < syllables(target) ||
      (h.length < t.length && (t.startsWith(h) || t.endsWith(h))),
  };
}
