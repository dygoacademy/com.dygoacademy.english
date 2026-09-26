import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';

import { GardenPreferencesProvider } from '@/components/garden/preferences';
import type { AppLocale, MeaningLocale } from '@/i18n/config';

import { gardenFontVariables } from './fonts';

/**
 * The root element of every garden page: `data-ui="garden"` switches on
 * the garden tokens (globals.css), the font classes define the
 * --font-* variables the font stacks chain together, and next-intl
 * provides the messages. Shared by the (garden) layout and the flag-only
 * canvas reference pages, so both render with exactly the same fonts.
 *
 * UI-L: `lang` is the app language (so `:lang(zh)` styles and VoiceOver
 * follow it); next-intl gets the formatting locale and time zone. The
 * reference pages pass their own `messages` (their language comes from
 * `?locale=`); the live layout lets the provider inherit them from
 * `src/i18n/request.ts`.
 */
export function GardenRoot({
  appLocale,
  formatLocale,
  timeZone,
  messages,
  meaningLocale,
  stored,
  children,
}: {
  appLocale: AppLocale;
  formatLocale: string;
  timeZone: string;
  messages?: AbstractIntlMessages;
  meaningLocale: MeaningLocale | null;
  /** What the profile stores (the language sheet shows these). */
  stored?: { uiLocale: AppLocale | null; meaningLocale: MeaningLocale | null };
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={formatLocale}
      timeZone={timeZone}
      {...(messages ? { messages } : {})}
    >
      <GardenPreferencesProvider
        value={{
          appLocale,
          meaningLocale,
          storedUiLocale: stored?.uiLocale ?? null,
        }}
      >
        <div data-ui="garden" lang={appLocale} className={`${gardenFontVariables} font-body`}>
          {children}
        </div>
      </GardenPreferencesProvider>
    </NextIntlClientProvider>
  );
}
