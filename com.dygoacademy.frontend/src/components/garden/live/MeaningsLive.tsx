'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { GARDEN_ROUTES } from '@/constants/garden';
import { type MyProfile, useMyProfile } from '@/hooks/useProfile';
import { apiClient } from '@/lib/api-client';

import { useGardenPreferences } from '../preferences';
import { MeaningsScreen, type MeaningChoice } from '../screens/MeaningsScreen';
import { reloadTo } from './reload';

/**
 * /me/meanings: A8d Meanings in.
 *
 * Starts on the garden's meaning language (the server's preferences) and
 * the profile's `recall_first` (GET /profiles/me; true when an older
 * backend doesn't send it). "Save" sends both in one PATCH /profiles/me
 * and goes back to Me: a full load when the meaning language changed (the
 * review card's meaning line and Me's row come from the server layout),
 * else a soft one. An error stays on the screen.
 */
export function MeaningsLive() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const preferences = useGardenPreferences();
  const profile = useMyProfile();
  const [meaning, setMeaning] = React.useState<MeaningChoice | null>(null);
  const [recall, setRecall] = React.useState<boolean | null>(null);

  const save = useMutation({
    mutationFn: (body: { meaningLocale: MeaningChoice; recallFirst: boolean }) =>
      apiClient.patch<MyProfile>('/profiles/me', {
        meaningLocale: body.meaningLocale === 'none' ? null : body.meaningLocale,
        recallFirst: body.recallFirst,
      }),
    onSuccess: (saved, body) => {
      queryClient.setQueryData(['profile', 'me'], saved);
      // The meaning language comes from the server layout (Me's row, the
      // review card's line): load /me afresh when it changed, as A8f does.
      if (body.meaningLocale !== (preferences.meaningLocale ?? 'none')) reloadTo(GARDEN_ROUTES.me);
      else router.push(GARDEN_ROUTES.me);
    },
  });

  const current = meaning ?? preferences.meaningLocale ?? 'none';
  const recallFirst = recall ?? profile.data?.recall_first ?? true;

  return (
    <MeaningsScreen
      backHref={GARDEN_ROUTES.me}
      meaning={current}
      recallFirst={recallFirst}
      onMeaning={setMeaning}
      onRecallFirst={setRecall}
      onSave={() => save.mutate({ meaningLocale: current, recallFirst })}
      saving={save.isPending}
      error={save.isError}
    />
  );
}
