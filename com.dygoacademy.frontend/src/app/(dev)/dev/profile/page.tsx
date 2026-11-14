import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import type { AppLocale } from '@/i18n/config';
import { loadMessages } from '@/i18n/messages';

import { ProfileGallery } from './ProfileGallery';

/**
 * /dev/profile — the Adult Profile screens (A8b Daily goal, A8c Reminder,
 * A8d Meanings in, iA8 iPad Me) drawn with the canvas boards' own sample
 * data, for the screenshot check against docs/design/garden/reference
 * (CLAUDE.md rule 13). Development only: a production build answers 404.
 * `?s=` names the reference without its `-vi` suffix (e.g. A8c-reminder,
 * A8c-reminder-smart); `locale` en-US, vi-VN or zh-CN; `ipad=1` turns the
 * iPad navigation on.
 */
export const metadata: Metadata = { title: 'Profile boards', robots: { index: false, follow: false } };

export default async function ProfileBoardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const sp = await searchParams;
  const locale: AppLocale = sp.locale === 'vi-VN' ? 'vi-VN' : sp.locale === 'zh-CN' ? 'zh-CN' : 'en-US';
  const messages = await loadMessages(locale);
  return (
    <GardenRoot
      appLocale={locale}
      formatLocale={locale}
      timeZone="UTC"
      messages={messages}
      meaningLocale={null}
      ipadNav={sp.ipad === '1'}
    >
      <ProfileGallery screen={sp.s ?? 'A8c-reminder'} />
    </GardenRoot>
  );
}
