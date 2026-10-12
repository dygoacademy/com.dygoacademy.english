'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type OnboardingLevel = 'A2' | 'B1' | 'B2' | 'C1';
/** IELTS = IELTS Academic, LIFE = "Just for me"; PTE is no longer offered (old rows keep it). */
export type StudyGoal = 'IELTS' | 'IELTS_GENERAL' | 'WORK' | 'TRAVEL' | 'LIFE' | 'PTE';

/** `GET /profiles/me/onboarding` (OB1, OB4, OB5). `onboarded_at` null = not finished. */
export interface Onboarding {
  onboarded_at: string | null;
  cefr_level: OnboardingLevel | null;
  study_goal: StudyGoal | null;
  target_band: number | null;
  first_topic_id: string | null;
}

/** `PATCH /profiles/me/onboarding` body (snake_case, mirrors UpdateOnboardingDto). */
export interface OnboardingChange {
  cefr_level?: OnboardingLevel;
  study_goal?: StudyGoal;
  target_band?: number | null;
  first_topic_id?: string | null;
  /** The browser's IANA zone; the server keeps it only while the profile has none. */
  timezone?: string;
  complete?: boolean;
}

const KEY = ['profile', 'onboarding'] as const;

export function useOnboarding() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<Onboarding>('/profiles/me/onboarding'),
  });
}

/** Saves OB1's choices (or `complete`); the query takes the reply. */
export function useUpdateOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: OnboardingChange) =>
      apiClient.patch<Onboarding>('/profiles/me/onboarding', change),
    onSuccess: (onboarding) => {
      queryClient.setQueryData(KEY, onboarding);
    },
  });
}
