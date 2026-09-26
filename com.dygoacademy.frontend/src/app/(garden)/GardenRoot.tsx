import { NextIntlClientProvider } from 'next-intl';

import { gardenFontVariables } from './fonts';

/**
 * The root element of every garden page: `data-ui="garden"` switches on
 * the garden tokens (globals.css), the font classes define the
 * --font-* variables the font stacks chain together, and next-intl
 * provides the messages. Shared by the (garden) layout and the flag-only
 * canvas reference pages, so both render with exactly the same fonts.
 */
export function GardenRoot({ locale, children }: { locale: string; children: React.ReactNode }) {
  return (
    <NextIntlClientProvider>
      <div data-ui="garden" lang={locale} className={`${gardenFontVariables} font-body`}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
