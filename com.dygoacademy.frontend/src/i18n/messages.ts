import type { AppLocale } from './config';

/**
 * The garden's message files, one per app language. Imported lazily so a
 * request only loads its own language. `messages/en.json` is the source:
 * `src/types/next-intl.d.ts` types every key from it, and the key-parity
 * test (messages.test.ts) checks the other files against it.
 */
type Messages = typeof import('../../messages/en.json');

const LOADERS: Partial<Record<AppLocale, () => Promise<{ default: Messages }>>> = {
  en: () => import('../../messages/en.json'),
  vi: () => import('../../messages/vi.json'),
  'zh-CN': () => import('../../messages/zh-CN.json'),
};

export async function loadMessages(locale: AppLocale): Promise<Messages> {
  const load = LOADERS[locale] ?? LOADERS.en!;
  return (await load()).default;
}
