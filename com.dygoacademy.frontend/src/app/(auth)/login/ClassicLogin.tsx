'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTENT_WIDTH } from '@/constants/layout';
import { ROUTES } from '@/constants/routes';
import { createClient } from '@/lib/supabase/client';

/**
 * Login route. Real now — until this pass every session report going back
 * to the first one described this as "Supabase Auth is wired, the form
 * isn't," which meant nothing in this app was reachable through a browser
 * at all, regardless of how much of the rest of the stack was built.
 * `signInWithPassword` against GoTrue directly (`lib/supabase/client.ts`),
 * not a magic link — the tech spec's own route-group comment names both,
 * but a password form is what the seeded fixtures
 * (`database/migrations/004_seed_data.sql`, this same pass) now actually
 * support: `sarah`/`marco`/`alex`/`priya`/`dana` @dygo.test, password
 * `dygo-dev-2026` for all five.
 *
 * `useSearchParams()` needs a Suspense boundary for Next's static
 * rendering (same reason `/study` and `/quiz` split into an outer page +
 * inner screen) — done here as one file since the form is small.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // A hard navigation (see SignOutButton's own comment on why), landing
    // back on whatever protected path middleware.ts bounced the caller
    // from — `?next=` — or the home dashboard if they arrived here directly.
    const next = searchParams.get('next') || ROUTES.home;
    router.push(next);
    router.refresh();
  }

  return (
    // `flex-1`, not `min-h-dvh` -- this page now renders inside
    // `(auth)/layout.tsx`'s own `min-h-dvh flex-col` shell, below the
    // shared `PublicNavbar` it added 2026-09-18 ("add dygo Nav to
    // register and login page"). The previous "Dygo" brand button here
    // (a `router.back()` call, live-requested 2026-09-05 so /login --
    // reachable from several different places -- returned to wherever the
    // visitor actually came from) was replaced by that shared nav for
    // consistency across all three guest-facing pages; PublicNavbar's
    // logo links to `/search` instead of going back, which was confirmed
    // with the user as an accepted tradeoff.
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <Card className={`w-full ${CONTENT_WIDTH.narrow}`}>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          {/* Seeded local test accounts: a dev-only hint, never shown by a
              production build (UAT / www.dygoacademy.com). */}
          {process.env.NODE_ENV !== 'production' ? (
            <CardDescription>
              Local dev fixtures: sarah / marco / alex / priya / dana @dygo.test, password{' '}
              <code>dygo-dev-2026</code>.
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@dygo.test"
              aria-label="Email"
              className="rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              className="rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            No account?{' '}
            <Link href={ROUTES.register} className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * The classic sign-in, unchanged (moved here from page.tsx in UI-A A-2 so
 * the page can pick the garden look behind the flag). Stays until UI-8.
 */
export function ClassicLogin() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
