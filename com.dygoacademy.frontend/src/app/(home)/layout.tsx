import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { getGardenLocaleContext } from '@/i18n/garden-locale';

/**
 * Home page HP-1 · the shell of the public home page at `/`. Signed-out
 * visitors only (a signed-in `/` is sent to /garden by middleware before
 * this renders), so nothing here needs a session: it gives the page the
 * garden fonts and tokens (`GardenRoot`) in the visitor's language
 * (`dygo_locale` cookie → Accept-Language → English, the same order as
 * the auth screens).
 */
export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const locale = await getGardenLocaleContext();
  return (
    <GardenRoot
      appLocale={locale.appLocale}
      formatLocale={locale.formatLocale}
      timeZone={locale.timeZone}
      meaningLocale={locale.meaningLocale}
      stored={locale.stored}
    >
      {children}
    </GardenRoot>
  );
}
