'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type OnboardingLevel = 'A2' | 'B1' | 'B2' | 'C1';
export type StudyGoal = 'IELTS' | 'PTE' | 'LIFE';

/** `GET /profiles/me/onboarding` (OB1–OB5). `onboarded_at` null = not finished. */
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
  complete?: boolean;
}

const KEY = ['profile', 'onboarding'] as const;

export function useOnboarding() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<Onboarding>('/profiles/me/onboarding'),
  });
}

/** Saves one step's choice (or `complete`); the query takes the reply. */
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
