import type { AppLocale } from './config';

/**
 * The garden's message files, one per locale (`messages/<code>.json`:
 * en-SG, en-US, vi-VN, zh-CN). Imported lazily so a request only loads
 * its own language. `messages/en-SG.json` is the source:
 * `src/types/next-intl.d.ts` types every key from it, and the key-parity
 * test (messages.test.ts) checks the other files against it.
 */
type Messages = typeof import('../../messages/en-SG.json');

const LOADERS: Partial<Record<AppLocale, () => Promise<{ default: Messages }>>> = {
  'en-SG': () => import('../../messages/en-SG.json'),
  'en-US': () => import('../../messages/en-US.json'),
  'vi-VN': () => import('../../messages/vi-VN.json'),
  'zh-CN': () => import('../../messages/zh-CN.json'),
};

export async function loadMessages(locale: AppLocale): Promise<Messages> {
  const load = LOADERS[locale] ?? LOADERS['en-SG']!;
  return (await load()).default;
}
