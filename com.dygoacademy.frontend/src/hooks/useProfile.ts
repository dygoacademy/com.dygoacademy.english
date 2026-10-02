'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { getResolvedTimezone } from '@/lib/timezone';

export type EnglishVariety = 'en-US' | 'en-GB';

/** `GET /profiles/me` (UI-L locales; UI-6 U6-4 prefs). */
export interface MyProfile {
  id: string;
  ui_locale: string | null;
  meaning_locale: string | null;
  english_variety: EnglishVariety;
  daily_goal_minutes: number;
}

export type KeepsakeKind = 'FIRST_HARVEST' | 'STREAK' | 'GOLDEN_BLOOMS';

/** `GET /me/keepsakes` (U6-4): earned, the next one per kind, Golden Blooms so far. */
export interface MyKeepsakes {
  earned: { kind: KeepsakeKind; value: number; earned_at: string }[];
  next: { kind: KeepsakeKind; value: number; progress: number; target: number }[];
  golden_blooms: number;
}

/** `PATCH /profiles/me` body for the UI-6 prefs (camelCase, like the locales). */
export interface ProfilePrefsChange {
  englishVariety?: EnglishVariety;
  dailyGoalMinutes?: number;
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => apiClient.get<MyProfile>('/profiles/me'),
  });
}

/**
 * Keepsakes sit under ['srs', ...] like the missions hooks: a rated card or
 * a finished quiz invalidates ['srs'], and both can earn one.
 */
export function useMyKeepsakes(timezone: string = getResolvedTimezone()) {
  return useQuery({
    queryKey: ['srs', 'keepsakes', timezone],
    queryFn: () => apiClient.get<MyKeepsakes>(`/me/keepsakes?tz=${encodeURIComponent(timezone)}`),
  });
}

/** Saves `english_variety` / `daily_goal_minutes`; the profile query takes the reply. */
export function useUpdateProfilePrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: ProfilePrefsChange) =>
      apiClient.patch<MyProfile>('/profiles/me', change),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile', 'me'], profile);
    },
  });
}
