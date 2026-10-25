'use client';

import { useTranslations } from 'next-intl';

import type { Msg } from '@/lib/pronunciation/pronunciationResult';

/** `screens.pronounce` messages from a view model's `{ key, values }` (lib/pronunciation). */
export function useMsg(): (m: Msg) => string {
  const t = useTranslations('screens.pronounce');
  return (m) => t(m.key as Parameters<typeof t>[0], m.values as Parameters<typeof t>[1]);
}
