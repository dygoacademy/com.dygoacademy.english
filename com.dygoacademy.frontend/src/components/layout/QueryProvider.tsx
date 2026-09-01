'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { useOfflineReviewSync } from '@/hooks/useOfflineReviewSync';

/**
 * TanStack Query — server-state caching, dedupe and optimistic updates
 * (tech spec §1: "Client State Management"). One QueryClient per browser
 * tab, created lazily inside state so it survives Fast Refresh but never
 * leaks across requests during SSR.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineReviewSyncBoundary />
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

/**
 * `useOfflineReviewSync` needs `useQueryClient()`, which only resolves
 * inside a `QueryClientProvider` descendant — it can't be called directly
 * in `QueryProvider` above this component's own return. Renders nothing;
 * existing only to give the hook somewhere valid to run from app-mount
 * onward, for every authenticated and unauthenticated route alike (Module
 * 4's offline queue drains regardless of which page the student is on when
 * connectivity returns — see the hook's own header comment).
 */
function OfflineReviewSyncBoundary() {
  useOfflineReviewSync();
  return null;
}
