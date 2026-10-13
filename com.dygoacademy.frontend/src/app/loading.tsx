import { cookies, headers } from 'next/headers';

import { GardenLoader } from '@/components/garden/loader/GardenLoader';
import {
  DEFAULT_TIME_ZONE,
  LOCALE_COOKIE,
  formattingLocale,
  resolveAppLocale,
} from '@/i18n/config';
import { loadMessages } from '@/i18n/messages';

import { GardenRoot } from './(garden)/GardenRoot';

/**
 * Loading state for any route without a closer loading.tsx: the landing and
 * sign-in pages, and the step right after signing in, while the garden layout
 * checks the session (it sits above `(garden)/loading.tsx`, so that one can't
 * cover it). It is the same loading screen as inside the garden (LD1 at app
 * start, then LD3; docs/plans/Loading screen implementation plan.md), which
 * replaced a bare grey spinner.
 *
 * It must appear at once, so it does not look the learner up (no session
 * call): the language is the `dygo_locale` cookie, then Accept-Language, then
 * English. Only the messages the loader reads (its lines and the tab bar's labels) are sent to the browser.
 */
export default async function Loading() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = resolveAppLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get('accept-language'),
  });
  const all = await loadMessages(locale);
  const messages = {
    screens: {
      live: { loading: all.screens.live.loading, retry: all.screens.live.retry },
      loader: all.screens.loader,
    },
    components: { tabBar: all.components.tabBar },
  };
  return (
    <GardenRoot
      appLocale={locale}
      formatLocale={formattingLocale(locale)}
      timeZone={DEFAULT_TIME_ZONE}
      messages={messages}
      meaningLocale={null}
    >
      <GardenLoader />
    </GardenRoot>
  );
}
