/**
 * IPA helpers for the speaking screens: the stressed syllable shown in
 * gold on SP1, "push on mɪt" on SP2, and the tip on SP3. Same syllable
 * split as the backend's `ipaSyllables` (speaking-timings.ts): on "." and
 * before stress marks; only primary stress (ˈ) counts.
 */
export interface IpaSegment {
  /** Text to show, including the stress mark and the "." before it. */
  text: string;
  /** The syllable without marks or dots. */
  syllable: string;
  stressed: boolean;
}

/** First transcription without slashes: "/ˈmɪt.ɪ.ɡeɪt/, /…/" → "ˈmɪt.ɪ.ɡeɪt". */
export function ipaCore(ipa: string | null | undefined): string {
  if (!ipa) return '';
  return ipa
    .trim()
    .replace(/^[/[]+|[/\]]+$/g, '')
    .split(/[,;]/)[0]
    .trim()
    .replace(/^[/[]+|[/\]]+$/g, '');
}

/**
 * Syllables of the first word of an IPA transcription (a phrase's first
 * word is its target, S0-a). A single unmarked syllable counts as stressed.
 */
export function ipaSegments(ipa: string | null | undefined): IpaSegment[] {
  const core = ipaCore(ipa).split(/\s+/)[0] ?? '';
  if (!core) return [];
  const out: IpaSegment[] = [];
  let buf = '';
  const push = () => {
    const syllable = buf.replace(/[ˈˌ.]/g, '');
    if (syllable)
      out.push({ text: buf, syllable, stressed: buf.replace(/^\./, '').startsWith('ˈ') });
    else if (out.length) out[out.length - 1].text += buf;
    buf = '';
  };
  for (const ch of core) {
    if ((ch === '.' || ch === 'ˈ' || ch === 'ˌ') && buf.replace(/[ˈˌ.]/g, '')) push();
    buf += ch;
  }
  push();
  if (out.length === 1 && !out[0].stressed) out[0].stressed = true;
  return out;
}

/** The stressed syllable ("mɪt"), or null. */
export function stressedSyllable(ipa: string | null | undefined): string | null {
  return ipaSegments(ipa).find((s) => s.stressed)?.syllable ?? null;
}

/** Syllable `index` (the scorer's `tipParams.syllable`), or null. */
export function syllableAt(ipa: string | null | undefined, index: number): string | null {
  return ipaSegments(ipa)[index]?.syllable ?? null;
}

/** Syllables with their stress, for the SP3 tip pattern ("**mɪt**-ɪ-ɡeɪt"; the screen bolds the stressed one). */
export function stressPattern(
  ipa: string | null | undefined,
): { syllable: string; stressed: boolean }[] {
  return ipaSegments(ipa).map(({ syllable, stressed }) => ({ syllable, stressed }));
}

/** IPA letters that count towards a syllable's length (marks and length signs don't). */
const ipaLength = (syllable: string) => syllable.replace(/[ːˑ̀-ͯ]/g, '').length;

/**
 * The written word split like its IPA syllables, for the tips the canvas
 * writes in spelling ("push on MIT", "Say MIT-i-gate"). There's no
 * spelling dictionary, so each syllable gets a share of the letters in
 * proportion to its IPA length (mɪt·ɪ·ɡeɪt → mit·i·gate). A phrase uses its
 * first word, like `ipaSegments`. Empty when there's no IPA or word.
 */
export function spellingSegments(
  word: string,
  ipa: string | null | undefined,
): { text: string; stressed: boolean }[] {
  const written = (word.trim().split(/\s+/)[0] ?? '').replace(/[^\p{L}'-]/gu, '');
  const segs = ipaSegments(ipa);
  if (!written || segs.length === 0) return [];
  if (segs.length === 1 || written.length < segs.length) {
    return [{ text: written, stressed: true }];
  }
  const lengths = segs.map((s) => Math.max(1, ipaLength(s.syllable)));
  const total = lengths.reduce((a, b) => a + b, 0);
  const out: { text: string; stressed: boolean }[] = [];
  let from = 0;
  let sum = 0;
  segs.forEach((s, i) => {
    sum += lengths[i];
    const left = segs.length - 1 - i; // syllables still to place, one letter each at least
    let to = i === segs.length - 1 ? written.length : Math.round((sum / total) * written.length);
    to = Math.min(written.length - left, Math.max(from + 1, to));
    out.push({ text: written.slice(from, to), stressed: s.stressed });
    from = to;
  });
  return out;
}

/** The stressed part of the written word in capitals ("MIT"), or null. */
export function stressedSpelling(word: string, ipa: string | null | undefined): string | null {
  const seg = spellingSegments(word, ipa).find((s) => s.stressed);
  return seg ? seg.text.toUpperCase() : null;
}
