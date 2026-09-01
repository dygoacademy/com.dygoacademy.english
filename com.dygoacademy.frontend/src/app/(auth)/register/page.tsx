'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/constants/routes';
import { createClient } from '@/lib/supabase/client';

/**
 * Register route. Real now, alongside /login — see that file's header for
 * why this pair was the single biggest blocker to browser UAT (nothing
 * else in the app is reachable without them). `signUp`, not an invite
 * redemption — that's `/join/:token` (Module 1, this same pass), for
 * someone arriving via a teacher's magic link, who becomes a group member
 * automatically. This form is for someone with no invite at all.
 *
 * `GOTRUE_MAILER_AUTOCONFIRM=true` (docker-compose.yml's `supabase-auth`
 * service) means signUp returns an active session immediately — no "check
 * your email" step to build here for local dev.
 *
 * One known gap surfaced while wiring this, not fixed here: `public.groups`
 * has `tenant_id` `not null`, and nothing provisions a tenant for a
 * newly-registered solo user (flagged since the first session report,
 * `dygo_academy_api_surface.md`'s own Phase 1 grooming note). A brand-new
 * account can sign in and browse public topics, but `POST /groups` will
 * fail until either that gap closes or they join an existing group through
 * a `/join/:token` invite instead — the caption below says so rather than
 * letting someone hit an unexplained 500.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      // Only reachable if GOTRUE_MAILER_AUTOCONFIRM is ever turned off —
      // not the local dev default, but handled rather than silently
      // stranding the user on a page that looks like it worked.
      setError('Check your email to confirm your account, then sign in.');
      setLoading(false);
      return;
    }

    router.push(ROUTES.topics);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Joining a class from a teacher&apos;s invite link? Open that link instead — it signs
            you in and adds you to the group in one step. This form is for starting fresh, and a
            brand-new account can&apos;t create its own group yet (no tenant to put it in).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email"
              className="rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min. 6 characters)"
              aria-label="Password"
              className="rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href={ROUTES.login} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
