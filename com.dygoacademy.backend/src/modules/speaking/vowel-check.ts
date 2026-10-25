/**
 * Pronunciation v2 scoring tune (draft, off until Dylan approves the numbers):
 * a vowel said as another vowel. The GOPT phone scores barely move when a
 * learner says the wrong vowel (UAT Step C, 2026-10-25: "mi-TIE-gate" scored
 * 98), so this looks at what the phoneme model heard over the vowel's own
 * frames (the speech server's tuning fields `top` / `top_p`, `gop`).
 *
 * A vowel is `wrong` when the sound heard most over its frames is a swap of
 * the target (`confusion` mode: a usual learner swap; `family` mode: any
 * vowel outside the target's family) with at least `wrongP` probability,
 * `unsure` (close) with at least `closeP`, else `ok`. Families accept the
 * usual variants of each sound (reduced vowels, US / UK, the dictionary's
 * schwa said as ɪ), so a native take stays ok.
 */

/** The model tokens heard as an acceptable version of each ARPAbet vowel. */
export const VOWEL_FAMILY: Record<string, readonly string[]> = {
  AA: ['ɑː', 'ɑ', 'ɐ', 'ɑːɹ', 'ɒ', 'ɔ', 'ɔː', 'a'],
  AE: ['æ', 'a'],
  AH: ['ʌ', 'ə', 'ɐ', 'ɪ', 'ɛ', 'ɚ', 'ɨ', 'ᵻ', 'i'],
  AO: ['ɔː', 'ɔ', 'ɑ', 'ɑː', 'oː', 'ɒ', 'ɔːɹ'],
  AW: ['aʊ'],
  AY: ['aɪ'],
  EH: ['ɛ', 'e', 'ɛɹ'],
  ER: ['ɜː', 'ɚ', 'ɜ', 'ɝ', 'əɹ'],
  EY: ['eɪ', 'e', 'eː'],
  IH: ['ɪ', 'ɨ', 'ᵻ', 'ə', 'i', 'ɪɹ'],
  IY: ['iː', 'i'],
  OW: ['oʊ', 'o', 'əʊ', 'oː'],
  OY: ['ɔɪ'],
  UH: ['ʊ', 'u', 'ʊɹ'],
  UW: ['uː', 'u', 'ʊ'],
};

/** Every vowel token the model knows (anything in a family). */
const VOWEL_TOKENS = new Set(Object.values(VOWEL_FAMILY).flat());

/**
 * The usual learner swaps (Vietnamese learners first): for each target, the
 * sounds that mean the learner said another vowel. Only these count in the
 * `confusion` mode, so an unstressed vowel the model hears oddly in a native
 * take (the dictionary's schwa as o, uː) isn't called wrong.
 */
export const VOWEL_CONFUSIONS: Record<string, readonly string[]> = {
  IH: ['iː', 'aɪ', 'eɪ', 'e', 'eː', 'ɛ'],
  IY: ['ɪ', 'aɪ', 'eɪ'],
  AH: ['aɪ', 'ɑ', 'ɑː', 'æ', 'a', 'oʊ', 'ɔ', 'ɔː'],
  AE: ['ɛ', 'e', 'eɪ', 'ɑ', 'ɑː', 'ʌ'],
  EH: ['æ', 'a', 'eɪ', 'iː', 'ɪ'],
  EY: ['æ', 'ɛ', 'a', 'aɪ', 'iː'],
  AA: ['ʌ', 'ə', 'æ', 'oʊ'],
  AO: ['oʊ', 'o', 'ʌ', 'uː'],
  OW: ['ɔ', 'ɔː', 'ɑ', 'ʌ', 'uː', 'aʊ'],
  UH: ['uː', 'u', 'ʌ', 'oʊ'],
  UW: ['ʊ', 'oʊ', 'ʌ'],
  ER: ['ɑ', 'ɑː', 'ɛ', 'e', 'ʌ'],
  AY: ['iː', 'i', 'eɪ', 'ɑ', 'æ'],
  AW: ['oʊ', 'ɑ', 'ɔ'],
  OY: ['oʊ', 'ɔ', 'aɪ'],
};

export interface VowelCheckOptions {
  /** `family`: any vowel outside the target's family; `confusion`: only the usual swaps. */
  mode: 'family' | 'confusion';
  /** A swap heard at least this much: wrong (wobbly, the word a retry). */
  wrongP: number;
  /** A swap heard at least this much (under `wrongP`): close. */
  closeP: number;
}

/** The recommended rule (docs/reports/pron-v2 scoring tune.md); confirm on teachers' labels before use. */
export const VOWEL_CHECK_DEFAULTS: VowelCheckOptions = { mode: 'confusion', wrongP: 0.5, closeP: 0.3 };

export type VowelVerdict = 'ok' | 'unsure' | 'wrong' | 'n/a';

/** The verdict for one phone of the scorer's reply; `n/a` for consonants or without the tuning fields. */
export function vowelVerdict(
  phone: { phone: string; top?: string | null; top_p?: number | null },
  opts: VowelCheckOptions = VOWEL_CHECK_DEFAULTS,
): VowelVerdict {
  const family = VOWEL_FAMILY[phone.phone];
  if (!family || !phone.top || phone.top_p == null) return 'n/a';
  if (family.includes(phone.top)) return 'ok';
  const swapped =
    opts.mode === 'confusion'
      ? (VOWEL_CONFUSIONS[phone.phone] ?? []).includes(phone.top)
      : VOWEL_TOKENS.has(phone.top);
  if (!swapped) return 'ok';
  return phone.top_p >= opts.wrongP ? 'wrong' : phone.top_p >= opts.closeP ? 'unsure' : 'ok';
}

/**
 * How a syllable's score and the word's total change (draft): a wrong vowel
 * makes the syllable wobbly (at most 55) and the word a retry (at most 75);
 * an unsure one makes the syllable close (at most 80). A syllable takes its
 * worst vowel.
 */
export function applyVowelCheck(
  syllables: readonly { score: number; vowels: readonly VowelVerdict[] }[],
  total: number,
): { scores: number[]; total: number } {
  let worst = total;
  const scores = syllables.map((s) => {
    if (s.vowels.includes('wrong')) {
      worst = Math.min(worst, 75);
      return Math.min(s.score, 55);
    }
    if (s.vowels.includes('unsure')) return Math.min(s.score, 80);
    return s.score;
  });
  return { scores, total: worst };
}
