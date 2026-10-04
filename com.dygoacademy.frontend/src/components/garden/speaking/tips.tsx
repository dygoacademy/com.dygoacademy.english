'use client';

import { useTranslations } from 'next-intl';

import { ipaSegments, syllableAt } from '@/lib/speaking/ipa';
import type { SpeakingWordMark } from '@/types';

/** `speak.tip.stress` → `tip.stress` under screens.speak. */
const tipPath = (tipKey: string) => tipKey.replace(/^speak\./, '') as 'tip.stress';

/** "ˈmɪt-ɪ-ɡeɪt": the IPA syllables joined, the stressed one marked. */
export function stressPatternText(ipa: string | null): string {
  return ipaSegments(ipa)
    .map((s) => (s.stressed ? `ˈ${s.syllable}` : s.syllable))
    .join('-');
}

/**
 * Title and body of the scorer's tip (handover §3 step 8), from
 * `screens.speak.tip.*`. Stress tips get the syllable from the IPA.
 */
export function useTipText() {
  const t = useTranslations('screens.speak');
  return (tipKey: string, params: Record<string, string> | undefined, ipa: string | null) => {
    const path = tipPath(tipKey);
    const values: Record<string, string> = { ...(params ?? {}) };
    if (path === 'tip.stress') {
      values.syllable = syllableAt(ipa, Number(params?.syllable ?? 0)) ?? '';
      values.pattern = stressPatternText(ipa);
    }
    const bold = (chunks: React.ReactNode) => <b>{chunks}</b>;
    return {
      title: t.rich(`${path}.title`, { ...values, b: bold }),
      body: t(`${path}.body`, values),
    };
  };
}

/** Short reason under a word that needs work ("mɪt is too soft"). */
export function useMarkReason() {
  const t = useTranslations('screens.speak');
  return (mark: SpeakingWordMark, ipa: string | null): string | null => {
    switch (mark.reason) {
      case 'stress_soft': {
        const syllable = ipaSegments(ipa).find((s) => s.stressed)?.syllable ?? '';
        return t('mark.stressSoft', { syllable });
      }
      case 'missing':
        return t('mark.missing');
      case 'rushed':
        return t('mark.rushed');
      case 'slow':
        return t('mark.slow');
      default:
        return null;
    }
  };
}
