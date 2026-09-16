import { SignOutButton } from '@/components/layout/SignOutButton';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Server Component (not `'use client'`) so the signed-in email can be read
 * straight off the session, same call `(dashboard)/layout.tsx` already
 * makes for the Navbar -- no extra client-side fetch/hook needed.
 *
 * The email started as a plain line under the "Settings" heading
 * (live-requested 2026-09-05, "the profile page need to show the email on
 * the top"), then moved into its own Account `Card` right below the
 * heading (same-day follow-up, "add that to the box below the settings")
 * -- shadcn `Card` is what `NotificationSettings` already builds its two
 * sections from, so this keeps the whole page one consistent stack of
 * cards instead of one plain-text line ahead of two boxed ones.
 */
export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <h1 className="text-lg font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{user?.email ?? 'unknown'}</CardDescription>
        </CardHeader>
      </Card>
      <NotificationSettings />
      {/* The header's account icon dropped its adjacent "Sign out" button
          (crowded narrow viewports) in favor of just linking here -- this
          is now the only place to sign out, so it needs to actually be
          here. */}
      <div className="border-t pt-4">
        <SignOutButton />
      </div>
    </main>
  );
}
