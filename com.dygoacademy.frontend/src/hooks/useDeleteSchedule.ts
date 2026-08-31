'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

/** `DELETE /api/v1/notifications/schedules/:id`. */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/notifications/schedules/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'schedules'] });
    },
  });
}
