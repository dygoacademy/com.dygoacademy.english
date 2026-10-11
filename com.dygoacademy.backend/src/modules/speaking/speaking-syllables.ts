import { ipaSyllables } from './speaking-timings';

/**
 * Pronunciation "Stepping stones" (2026-10-11): the word split into the
 * syllables the learner sees on the stones and the Bees rows (MI · ti ·
 * gate), with the stressed one from the IPA's ˈ.
 *
 * The spelling is split by vowel groups, consonants between them going to
 * the next syllable (one consonant, a digraph like "th", or a cluster like
 * "str"; otherwise the cluster is split). Not English hyphenation patterns
 * (the plan's suggestion): those split for print ("mit·i·gate"), not the
 * way the boards show the word ("mi·ti·gate"). When the spelling's count
 * differs from the IPA's, the IPA syllables are shown instead (stress marks
 * dropped), so the stones always match the sounds.
 *
 * No I/O here, so it's unit-tested.
 */

export interface SpeakingSyllable {
  text: string;
  stressed: boolean;
}

/** Letters that start a syllable together (ma·tron, con·struct). */
const ONSETS = new Set(
  'bl br ch cl cr dr fl fr gl gr ph pl pr qu sh th tr wh wr chr sch scr shr spl spr squ str thr'.split(
    ' ',
  ),
);
/** Stay with the syllable before: pick·et, sing·er. */
const ENDS = new Set(['ck', 'ng']);

const isVowelAt = (w: string, i: number): boolean => {
  const c = w[i];
  if ('aeiou'.includes(c)) return true;
  // y is a vowel after a consonant (sys, happy), or after a vowel before a consonant / the end (day, boys).
  if (c !== 'y' || i === 0) return false;
  if (!'aeiou'.includes(w[i - 1])) return true;
  return i + 1 >= w.length || !'aeiou'.includes(w[i + 1]);
};

/** Where the consonants `c` between two vowel groups split: how many stay with the syllable before. */
function keepBefore(c: string): number {
  if (c.length <= 1) return 0;
  if (ENDS.has(c.slice(0, 2))) return 2;
  if (c.length === 2) return ONSETS.has(c) ? 0 : 1;
  if (ONSETS.has(c.slice(-3))) return c.length - 3;
  if (ONSETS.has(c.slice(-2))) return c.length - 2;
  return c.length - 1;
}

/** The spelling split into syllables ("mitigate" → mi, ti, gate); [] for anything but plain letters. */
export function splitSpelling(word: string | null | undefined): string[] {
  const w = (word ?? '').trim().toLowerCase();
  if (!/^[a-z]+$/.test(w)) return [];
  const groups: [number, number][] = [];
  for (let i = 0; i < w.length;) {
    if (!isVowelAt(w, i)) {
      i++;
      continue;
    }
    const start = i;
    while (i < w.length && isVowelAt(w, i)) i++;
    groups.push([start, i]);
  }
  // A final silent e joins the syllable before (gate), unless it's "-le" after a consonant (ta·ble).
  const last = groups[groups.length - 1];
  if (groups.length > 1 && last[0] === w.length - 1 && w.endsWith('e') && !/[^aeiou]le$/.test(w)) {
    groups.pop();
  }
  if (groups.length === 0) return [w];
  const cuts = [0];
  for (let k = 1; k < groups.length; k++) {
    const from = groups[k - 1][1];
    const between = w.slice(from, groups[k][0]);
    cuts.push(from + keepBefore(between));
  }
  cuts.push(w.length);
  return cuts.slice(0, -1).map((at, k) => w.slice(at, cuts[k + 1]));
}

/** The IPA's syllables as text, stress marks dropped ("/ˈmɪt.ɪ.ɡeɪt/" → mɪt, ɪ, ɡeɪt). */
function ipaSyllableTexts(ipa: string): string[] {
  const core = ipa
    .split(/[,;]/)[0]
    .trim()
    .replace(/^[/[]+|[/\]]+$/g, '')
    .trim();
  return core
    .split('.')
    .flatMap((chunk) => chunk.split(/(?=[ˈˌ])/))
    .map((p) => p.replace(/[ˈˌ]/g, '').trim())
    .filter(Boolean);
}

/**
 * The syllables to show for `word`: its spelling split when that gives as
 * many syllables as `ipa`, otherwise the IPA's own syllables. The stressed
 * one comes from the IPA. [] without an IPA.
 */
export function wordSyllables(
  word: string | null | undefined,
  ipa: string | null | undefined,
): SpeakingSyllable[] {
  const stress = ipaSyllables(ipa);
  if (stress.length === 0 || !ipa) return [];
  const spelled = splitSpelling(word);
  const texts = spelled.length === stress.length ? spelled : ipaSyllableTexts(ipa);
  if (texts.length !== stress.length) return [];
  return texts.map((text, k) => ({ text, stressed: stress[k].stressed }));
}
