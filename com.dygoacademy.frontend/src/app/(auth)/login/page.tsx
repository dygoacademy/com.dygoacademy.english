import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Login route. Wires into GoTrue via src/lib/supabase.ts once the auth flow
 * (email/password, magic link) is built — Phase 1. Route group per tech
 * spec §2: app/(auth)/.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Coming in Phase 1 — Supabase Auth is wired, the form isn&apos;t.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
