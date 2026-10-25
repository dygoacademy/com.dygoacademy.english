import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import type { AppLocale } from '@/i18n/config';
import { loadMessages } from '@/i18n/messages';

import { PronGallery } from './PronGallery';

/**
 * /dev/pron — Pronunciation screens drawn from the canvas boards' own
 * sample data, for the screenshot check against
 * docs/design/garden/reference (CLAUDE.md rule 13). Development only: a
 * production build answers 404. `?s=` names the board state (P1, P2,
 * P2-beep, P3, P3-failed, P2b-quiet, P2b-noisy, P2b-other, P4, SP0-ask,
 * SP0-denied; `comb`: the honeycomb's building blocks, every mode × 2 / 3 /
 * 4 syllables); `word` (mitigate / compensation / cloudy / sunny), P4 also
 * takes `result` (pass / almost / retry) and `round` (next / last);
 * `locale` en-US or vi-VN; `ipad=1` turns the iPad layout on (600px+).
 */
export const metadata: Metadata = { title: 'Pronunciation boards', robots: { index: false, follow: false } };

export default async function PronBoardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const sp = await searchParams;
  const locale: AppLocale = sp.locale === 'vi-VN' ? 'vi-VN' : sp.locale === 'zh-CN' ? 'zh-CN' : 'en-US';
  const messages = await loadMessages(locale);
  return (
    <GardenRoot appLocale={locale} formatLocale={locale} timeZone="UTC" messages={messages} meaningLocale={null} ipadNav={sp.ipad === '1'}>
      <PronGallery
        screen={sp.s ?? 'P1'}
        result={sp.result === 'almost' || sp.result === 'retry' ? sp.result : 'pass'}
        round={sp.round === 'last' ? 'last' : 'next'}
        word={sp.word === 'compensation' || sp.word === 'cloudy' || sp.word === 'sunny' ? sp.word : 'mitigate'}
        vi={locale === 'vi-VN'}
      />
    </GardenRoot>
  );
}
