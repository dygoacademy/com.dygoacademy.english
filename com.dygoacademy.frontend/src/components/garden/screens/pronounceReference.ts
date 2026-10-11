import type { AppLocale } from '@/i18n/config';
import type { PronResultView } from '@/lib/speaking/pronounce';
import type { SpeakingSyllable } from '@/types';

/**
 * Sample data for the Pronunciation reference pages (`/garden/_reference/P*`
 * and `iP*`), as the canvas draws it (PronStones*.dc.html, iPadPron*.dc.html):
 * "mitigate", MI · ti · gate, bee 1 of 3; `ti` wobbly, heard /taɪ/ for /tɪ/;
 * "another word" heard "medicate"; next word "deforestation".
 */
export const PRON_REF_SYLLABLES: SpeakingSyllable[] = [
  { text: 'mi', stressed: true },
  { text: 'ti', stressed: false },
  { text: 'gate', stressed: false },
];

export const PRON_REF = {
  word: 'mitigate',
  ipa: '/ˈmɪt.ɪ.ɡeɪt/',
  heard: 'medicate',
  nextWord: 'deforestation',
  index: 0,
  total: 3,
};

/** The meaning line: the phone boards and the iPad boards word it differently in English. */
export function pronRefMeaning(locale: AppLocale, ipad: boolean): string {
  if (locale === 'vi-VN') return 'giảm nhẹ, làm dịu bớt';
  if (locale === 'zh-CN') return '减轻，缓和';
  return ipad ? 'to make something bad less harmful or serious' : 'to make something less harmful';
}

/** The bed in the iPad header ("Pronunciation · Environment"). */
export function pronRefTopic(locale: AppLocale): string {
  return locale === 'vi-VN' ? 'Môi trường' : locale === 'zh-CN' ? '环境' : 'Environment';
}

export const PRON_REF_RETRY: PronResultView = {
  passed: false,
  stones: PRON_REF_SYLLABLES,
  wobbly: [false, true, false],
  first: { index: 1, text: 'ti', heardIpa: 'taɪ', ipa: 'tɪ' },
};

export const PRON_REF_PASS: PronResultView = {
  passed: true,
  stones: PRON_REF_SYLLABLES,
  wobbly: [false, false, false],
  first: null,
};

/** "Your voice" bars as live levels (full bar = 0.2): the phone board's ten bars… */
export const PRON_REF_LEVELS_PHONE = [22, 30, 18, 26, 14, 28, 20, 24, 16, 28].map(
  (h) => (h / 30) * 0.2,
);
/** …and the iPad board's twelve. */
export const PRON_REF_LEVELS_IPAD = [28, 36, 24, 32, 20, 34, 26, 30, 22, 34, 28, 32].map(
  (h) => (h / 36) * 0.2,
);
