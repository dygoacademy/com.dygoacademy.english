'use client';

import { useTranslations } from 'next-intl';

import type { ShownMark } from '@/lib/speaking/check';
import { ipaSegments, spellingSegments, stressedSpelling } from '@/lib/speaking/ipa';

/** `speak.tip.stress` → `tip.stress` under screens.speak. */
const tipPath = (tipKey: string) =>
  tipKey.replace(/^speak\./, '') as
    'tip.stress' | 'tip.missing' | 'tip.rushed' | 'tip.slow' | 'tip.flowed' | 'tip.unclear';

/** "ˈmɪt-ɪ-ɡeɪt": the IPA syllables joined, the stressed one marked. */
export function stressPatternText(ipa: string | null): string {
  return ipaSegments(ipa)
    .map((s) => (s.stressed ? `ˈ${s.syllable}` : s.syllable))
    .join('-');
}

/**
 * The spoken pattern as the canvas writes it, "MIT-i-gate": spelling
 * syllables joined with "-", the stressed one in capitals. Split in three
 * so the message can bold the stressed part.
 */
export function spellingPattern(
  word: string,
  ipa: string | null,
): { before: string; stressed: string; after: string } {
  const parts = spellingSegments(word, ipa);
  const at = parts.findIndex((p) => p.stressed);
  if (at < 0) return { before: '', stressed: word, after: '' };
  const join = (list: typeof parts) => list.map((p) => p.text).join('-');
  return {
    before: at > 0 ? `${join(parts.slice(0, at))}-` : '',
    stressed: parts[at].text.toUpperCase(),
    after: at < parts.length - 1 ? `-${join(parts.slice(at + 1))}` : '',
  };
}

/** A token without its punctuation ("change." → "change"). */
const bare = (token: string) => token.replace(/^[^\p{L}']+|[^\p{L}']+$/gu, '');

/**
 * Title and body of the check's tip (handover v2 §3 tip order), from
 * `screens.speak.tip.*`. A stress tip says the stressed syllable in
 * spelling ("make MIT stronger", "Say MIT-i-gate") and, when other words
 * need work too, ends with "Also keep the, and say effects /…/."
 * (`tip.also.*`) instead of "The rest of the sentence flowed well."
 */
export function useTipText() {
  const t = useTranslations('screens.speak');
  return (
    tipKey: string,
    params: Record<string, string> | undefined,
    ipa: string | null,
    others?: { tokens: readonly string[]; marks: readonly ShownMark[]; targetIndex: number },
  ) => {
    const path = tipPath(tipKey);
    const bold = (chunks: React.ReactNode) => <b>{chunks}</b>;
    if (path !== 'tip.stress') {
      return {
        title: t.rich(`${path}.title`, { ...(params ?? {}), b: bold }),
        body: t.rich(`${path}.body`, { ...(params ?? {}), b: bold }),
      };
    }
    const word = bare(params?.word ?? '');
    const pattern = spellingPattern(word, ipa);
    const count = String(ipaSegments(ipa).length);
    const title = t.rich('tip.stress.title', {
      word,
      syllable: stressedSpelling(word, ipa) ?? '',
      b: bold,
    });
    const rest = (others?.marks ?? []).filter((m) => !m.ok && m.index !== others?.targetIndex);
    const missing = rest.find((m) => m.reason === 'missing');
    const unclear = rest.find((m) => m.reason === 'unclear');
    const wordAt = (m: ShownMark) => bare(others?.tokens[m.index] ?? '');
    const values = { ...pattern, count, b: bold };
    if (!missing && !unclear) {
      return { title, body: t.rich('tip.stress.body', values) };
    }
    const also = missing && unclear ? 'both' : missing ? 'missing' : 'unclear';
    return {
      title,
      body: (
        <>
          {t.rich('tip.stress.bodyShort', values)}{' '}
          {t.rich(`tip.also.${also}`, {
            missing: missing ? wordAt(missing) : '',
            unclear: unclear ? wordAt(unclear) : '',
            ipa: unclear?.ipa ?? 'none',
            b: bold,
          })}
        </>
      ),
    };
  };
}

/**
 * Short reason under a word that needs work: "MIT is too soft",
 * "missing", "heard “affects”".
 */
export function useMarkReason() {
  const t = useTranslations('screens.speak');
  return (mark: ShownMark, word: string, ipa: string | null): string | null => {
    switch (mark.reason) {
      case 'stress_soft':
        return t('mark.stressSoft', { syllable: stressedSpelling(bare(word), ipa) ?? '' });
      case 'missing':
        return t('mark.missing');
      case 'unclear':
        return mark.heard ? t('mark.heard', { word: mark.heard }) : t('mark.unclear');
      default:
        return null;
    }
  };
}
