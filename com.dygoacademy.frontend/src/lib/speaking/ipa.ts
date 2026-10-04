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
