import { SignOutButton } from '@/components/layout/SignOutButton';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTENT_WIDTH } from '@/constants/layout';
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
 *
 * `SignOutButton` moved into this Account card 2026-09-18 ("refactor the
 * logout button. That seem like not UI/UX design") -- it previously sat
 * on its own below `NotificationSettings`, as a lone small button under a
 * `border-t` divider with no Card, no heading, nothing tying it to what
 * it actually does. Every other section on this page is a `Card`; Sign
 * out is semantically an account action anyway (same subject as the
 * email shown above it), so it now lives as that Card's `CardContent`
 * instead of an orphaned block underneath two unrelated cards.
 */
export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className={`mx-auto flex ${CONTENT_WIDTH.default} flex-col gap-6 p-8`}>
      <h1 className="text-lg font-semibold">Settings</h1>
      {/* The header's account icon dropped its adjacent "Sign out" button
          (crowded narrow viewports) in favor of just linking here -- this
          is now the only place to sign out, so it needs to actually be
          here; it lives in this Card's CardContent, not a separate block,
          since it's the same "Account" subject as the email above it. */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{user?.email ?? 'unknown'}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>
      <NotificationSettings />
    </main>
  );
}
