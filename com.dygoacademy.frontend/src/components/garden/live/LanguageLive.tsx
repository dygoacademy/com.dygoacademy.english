'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setGardenLocaleCookie } from '@/app/(garden)/actions';
import { GARDEN_ROUTES } from '@/constants/garden';
import { type EnglishVariety, type MyProfile, useMyProfile } from '@/hooks/useProfile';
import type { AppLocale } from '@/i18n/config';
import { apiClient } from '@/lib/api-client';

import { useGardenPreferences } from '../preferences';
import { LanguageScreen } from '../screens/LanguageScreen';

/**
 * /me/language: A8f Language & accent.
 *
 * Starts on the language the garden is rendered in and the profile's
 * `english_variety`. "Save" stores the app language the way the old
 * language sheet did (the `dygo_locale` cookie and `ui_locale`, so it
 * follows the learner to other devices) together with `english_variety`
 * in one PATCH /profiles/me. The profile query takes the reply (IPA and
 * audio read the accent from it), the garden re-renders on the server in
 * the new language, and the learner is back on Me. An error stays here.
 */
export function LanguageLive() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const preferences = useGardenPreferences();
  const profile = useMyProfile();
  const [appLocale, setAppLocale] = React.useState<AppLocale | null>(null);
  const [variety, setVariety] = React.useState<EnglishVariety | null>(null);

  const current = appLocale ?? preferences.appLocale;
  const accent = variety ?? profile.data?.english_variety ?? 'en-US';

  const save = useMutation({
    mutationFn: async (body: { uiLocale: AppLocale; englishVariety: EnglishVariety }) => {
      if (body.uiLocale !== preferences.appLocale) await setGardenLocaleCookie(body.uiLocale);
      return apiClient.patch<MyProfile>('/profiles/me', body);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['profile', 'me'], saved);
      router.refresh();
      router.push(GARDEN_ROUTES.me);
    },
  });

  return (
    <LanguageScreen
      backHref={GARDEN_ROUTES.me}
      appLocale={current}
      variety={accent}
      onAppLocale={setAppLocale}
      onVariety={setVariety}
      onSave={() => save.mutate({ uiLocale: current, englishVariety: accent })}
      saving={save.isPending}
      error={save.isError}
    />
  );
}
