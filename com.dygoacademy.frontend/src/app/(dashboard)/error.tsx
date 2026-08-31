'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Dashboard-scoped error boundary. Separate from app/error.tsx so a
 * failure inside, say, the SRS queue (Phase 2) doesn't tear down the
 * Navbar too — the user stays signed in and oriented, with a retry
 * confined to the page that actually broke.
 */
export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="flex items-center justify-center p-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>This page couldn&apos;t load</CardTitle>
          <CardDescription>
            {error.digest ? `Reference: ${error.digest}` : 'An unexpected error occurred.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </main>
  );
}
