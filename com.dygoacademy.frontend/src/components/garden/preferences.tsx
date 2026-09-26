'use client';

import * as React from 'react';

import type { AppLocale, MeaningLocale } from '@/i18n/config';

/**
 * The learner's language settings inside the garden (UI-L), from the
 * server: the app language the page is rendered in, the meaning language
 * for the review card, and what the profile stores (null = not chosen
 * yet, the language came from the cookie or the browser).
 */
export interface GardenPreferences {
  appLocale: AppLocale;
  meaningLocale: MeaningLocale | null;
  storedUiLocale: AppLocale | null;
}

const GardenPreferencesContext = React.createContext<GardenPreferences>({
  appLocale: 'en',
  meaningLocale: null,
  storedUiLocale: null,
});

export function GardenPreferencesProvider({
  value,
  children,
}: {
  value: GardenPreferences;
  children: React.ReactNode;
}) {
  const memo = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.appLocale, value.meaningLocale, value.storedUiLocale],
  );
  return (
    <GardenPreferencesContext.Provider value={memo}>{children}</GardenPreferencesContext.Provider>
  );
}

export function useGardenPreferences(): GardenPreferences {
  return React.useContext(GardenPreferencesContext);
}
