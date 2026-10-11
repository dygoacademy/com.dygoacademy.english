'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import {
  isVoiceDonationOn,
  type VoiceDonationChange,
  type VoiceDonationStatus,
} from '@/lib/voice-donation';

const KEY = ['profile', 'voice-donation'] as const;

/** The learner's voice donation setting; never fetched with the flag off. */
export function useVoiceDonation(enabled: boolean = isVoiceDonationOn()) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<VoiceDonationStatus>('/profiles/me/voice-donation'),
    enabled,
  });
}

/** Turns donation on ("Yes, donate") or off; the query takes the reply. */
export function useSetVoiceDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: VoiceDonationChange) =>
      apiClient.put<VoiceDonationStatus>('/profiles/me/voice-donation', change),
    onSuccess: (status) => queryClient.setQueryData(KEY, status),
  });
}

/** "Delete my donated recordings": donation is off and the count goes to 0. */
export function useDeleteVoiceDonations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.delete<{ deleting: number }>('/profiles/me/voice-donation/recordings'),
    onSuccess: () =>
      queryClient.setQueryData<VoiceDonationStatus>(KEY, {
        donating: false,
        since: null,
        count: 0,
        region: null,
      }),
  });
}
