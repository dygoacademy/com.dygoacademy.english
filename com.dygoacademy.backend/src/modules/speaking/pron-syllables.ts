import { splitSpelling, wordSyllables, type SpeakingSyllable } from './speaking-syllables';
import { ipaSyllables } from './speaking-timings';
import type { SpeakingAccent } from './speaking-timings';

/**
 * Pronunciation v2 (plan of 2026-10-25): the stones are stored per word and
 * accent (master_lexicon.syllables_us / _uk, 20261025_word_pron_data.sql)
 * instead of worked out on each request. This builds them (enrichment and
 * `npm run pron-backfill`) and reads them back for an accent. No I/O, so it's
 * unit-tested.
 */

/** One stored syllable: the stone's text, the big stone, and where it is in the accent's word clip. */
export interface StoredSyllable extends SpeakingSyllable {
  start_ms: number | null;
  end_ms: number | null;
}

const VOWELS = new Set([...'aeiouyæɑɒɔəɚɛɜɝɪʊʌɐøœɘɵɤɯ']);
const DIPHTHONGS = ['eɪ', 'aɪ', 'ɔɪ', 'oʊ', 'əʊ', 'aʊ', 'ɪə', 'eə', 'ɛə', 'ʊə'];
/** Consonants after which an unmarked n, l or m is its own syllable (garden /ˈɡɑːdn/, circle /ˈsɜːkl/). */
const SONORANTS = new Set([...'lrnmŋjwɹ']);

/**
 * The IPA's syllables, one per vowel sound, with the stressed one (ˈ):
 * a diphthong or long vowel is one ("snoʊi" = oʊ + i), a syllabic n, l or m
 * after an obstruent is one even without its mark (gar·dn, sɜː·kl, seɪ·ʃn),
 * dots don't matter. [] without an IPA.
 */
export function ipaUnits(ipa: string | null | undefined): { stressed: boolean }[] {
  if (!ipa) return [];
  const core = [
    ...ipa
      .split(/[,;]/)[0]
      .trim()
      .replace(/^[/[]+|[/\]]+$/g, '')
      .replace(/[()]/g, '')
      .normalize('NFC'),
  ];
  const out: { stressed: boolean }[] = [];
  let stressNext = false;
  const isVowel = (c: string | undefined) => !!c && VOWELS.has(c);
  for (let i = 0; i < core.length; i++) {
    const c = core[i];
    if (c === 'ˈ') {
      stressNext = true;
      continue;
    }
    const prev = core[i - 1];
    const next = core[i + 1];
    const syllabic =
      c === '\u0329' ||
      ('nlm'.includes(c) &&
        !!prev &&
        !isVowel(prev) &&
        prev !== 'ː' &&
        !'ˈˌ.'.includes(prev) &&
        !SONORANTS.has(prev) &&
        !isVowel(next) &&
        next !== '\u0329');
    if (isVowel(c) || syllabic) {
      if (c === '\u0329') continue; // counted with its consonant below
      out.push({ stressed: stressNext });
      stressNext = false;
      if (isVowel(c)) {
        // One vowel sound: a diphthong, or a vowel with its length mark.
        if (next && DIPHTHONGS.includes(c + next)) i += 1;
        if (core[i + 1] === 'ː') i += 1;
      }
    }
  }
  if (out.length === 1) out[0].stressed = true;
  if (out.length > 1 && !out.some((u) => u.stressed)) out[0].stressed = true;
  return out;
}

/**
 * The stones for a word in an accent: the spelling split into syllables
 * (MI · ti · gate; a hyphenated word by its parts), the stressed one from
 * the IPA, when the spelling and the IPA have as many syllables. Else the
 * older split (the IPA's own dots) when it gives plain spelling. Else []:
 * the word is blocked and listed for a content check, never shown with IPA
 * on its stones. A phrase ("flat tyre") gets none: the scorer only scores a
 * take as one word.
 */
export function buildSyllables(word: string, ipa: string | null | undefined): StoredSyllable[] {
  const w = word.trim().toLowerCase();
  if (!ipa || /\s/.test(w)) return [];
  const units = ipaUnits(ipa);
  const spelled = fitSpelling(
    w.split('-').flatMap((part) => splitSpelling(part)),
    units.length,
  );
  const none = { start_ms: null, end_ms: null };
  if (spelled.length > 0 && spelled.length === units.length) {
    return spelled.map((text, k) => ({ text, stressed: units[k].stressed, ...none }));
  }
  const older = wordSyllables(w, ipa);
  if (older.length > 0 && !stonesShowIpa(older)) return older.map((s) => ({ ...s, ...none }));
  return [];
}

/** Vowel pairs said as two syllables (di·et, li·on, punc·tu·al, ob·vi·ous). */
const HIATUS = ['ia', 'ie', 'io', 'iu', 'ua', 'ue', 'uo', 'eo'];

/**
 * The spelling split brought to the IPA's `n` syllables, when it's off:
 * - too many: a silent e inside a compound joins the syllable before it
 *   (ho·me·work → home·work, ti·me·line → time·line), last first; then a
 *   final -ed / -es that isn't a syllable (fur·ni·shed → fur·nished);
 * - too few: two vowels said apart split (diet → di·et, lion → li·on).
 * Unchanged when it can't be fixed (the caller then blocks the word).
 */
export function fitSpelling(spelled: readonly string[], n: number): string[] {
  let sp = [...spelled];
  const silentE = /^[^aeiouy]+e$/;
  while (sp.length > n) {
    let k = -1;
    for (let i = sp.length - 1; i >= 1; i--) {
      // Not a consonant + le, which is its own syllable (ta·ble).
      if (silentE.test(sp[i]) && !/[^aeiouy]le$/.test(sp[i])) {
        k = i;
        break;
      }
    }
    if (k < 0 && sp.length > 1 && /^[^aeiouy]*e[sd]$/.test(sp[sp.length - 1])) k = sp.length - 1;
    if (k < 0) break;
    sp = [...sp.slice(0, k - 1), sp[k - 1] + sp[k], ...sp.slice(k + 1)];
  }
  while (sp.length < n) {
    let done = false;
    for (let i = 0; i < sp.length && !done; i++) {
      for (let j = 0; j + 1 < sp[i].length; j++) {
        if (HIATUS.includes(sp[i].slice(j, j + 2))) {
          sp = [...sp.slice(0, i), sp[i].slice(0, j + 1), sp[i].slice(j + 1), ...sp.slice(i + 1)];
          done = true;
          break;
        }
      }
    }
    if (!done) break;
  }
  return sp;
}

/** True when the stones show IPA (the spelling couldn't be split to match it), e.g. "rhythm". */
export function stonesShowIpa(stones: readonly SpeakingSyllable[]): boolean {
  return stones.some((s) => !/^[a-z'-]+$/i.test(s.text));
}

/**
 * The IPA of each stone, for the SSML that times them: the IPA's own
 * syllables (dots and stress marks), stress marks kept, when it has as many
 * as there are stones; else null (the spans are then spread by letters).
 */
export function ipaPerStone(ipa: string | null | undefined, stones: number): string[] | null {
  if (!ipa) return null;
  const core = ipa
    .split(/[,;]/)[0]
    .trim()
    .replace(/^[/[]+|[/\]]+$/g, '')
    .replace(/[()]/g, '')
    .trim();
  const parts = core
    .split('.')
    .flatMap((chunk) => chunk.split(/(?=[ˈˌ])/))
    .map((p) => p.trim())
    .filter((p) => p.replace(/[ˈˌ]/g, ''));
  return parts.length === stones && ipaSyllables(ipa).length === stones ? parts : null;
}

/**
 * Where each stone is in the word clip (ms). `marks` are the SSML mark times
 * (s) of a synthesis with one `<phoneme>` per stone (`mark k` before stone
 * k, then `end`), and `markedVoiced` that synthesis's voiced part; it says
 * the word more carefully (27 % longer for "mitigate", measured 2026-10-25),
 * so the boundaries are scaled onto the word clip's own voiced part
 * (`clipVoiced`). Without marks the stones split the clip by letters.
 */
export function syllableSpans(
  stones: readonly SpeakingSyllable[],
  clipVoiced: { start: number; end: number },
  marks?: { times: readonly number[]; voiced: { start: number; end: number } } | null,
): { start_ms: number; end_ms: number }[] {
  const n = stones.length;
  const len = clipVoiced.end - clipVoiced.start;
  let cuts: number[];
  if (marks && marks.times.length >= n && marks.voiced.end > marks.voiced.start) {
    const span = marks.voiced.end - marks.voiced.start;
    cuts = marks.times
      .slice(1, n)
      .map(
        (t) => clipVoiced.start + Math.min(1, Math.max(0, (t - marks.voiced.start) / span)) * len,
      );
  } else {
    const letters = stones.map((s) => Math.max(1, s.text.length));
    const total = letters.reduce((a, b) => a + b, 0);
    let at = 0;
    cuts = letters.slice(0, -1).map((l) => {
      at += l;
      return clipVoiced.start + (at / total) * len;
    });
  }
  const edges = [clipVoiced.start, ...cuts, clipVoiced.end].map((s) => Math.round(s * 1000));
  for (let k = 1; k < edges.length; k++) edges[k] = Math.max(edges[k], edges[k - 1]);
  return stones.map((_, k) => ({ start_ms: edges[k], end_ms: edges[k + 1] }));
}

/** A stone's text as shown: the stressed one in capitals when it is plain letters (MI), as the app's stoneText. */
export function stoneText(s: SpeakingSyllable): string {
  return s.stressed && /^[a-z]+$/i.test(s.text) ? s.text.toUpperCase() : s.text;
}

/** A row's stored syllables for `accent`; the other accent's when that one has none. */
export function storedStones(
  row: { syllables_us?: StoredSyllable[] | null; syllables_uk?: StoredSyllable[] | null },
  accent: SpeakingAccent,
): { syllables: StoredSyllable[]; accent: SpeakingAccent } {
  const own = accent === 'UK' ? row.syllables_uk : row.syllables_us;
  if (own && own.length > 0) return { syllables: own, accent };
  const other = accent === 'UK' ? row.syllables_us : row.syllables_uk;
  if (other && other.length > 0) return { syllables: other, accent: accent === 'UK' ? 'US' : 'UK' };
  return { syllables: [], accent };
}
