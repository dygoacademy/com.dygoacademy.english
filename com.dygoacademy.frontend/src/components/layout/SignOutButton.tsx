'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      // The default signOut() scope calls GoTrue's own /logout endpoint
      // before clearing the local session -- if that call fails (stack
      // down, network hiccup, CORS), the awaited promise above rejects
      // and, without this catch, the function would stop right there:
      // `loading` stuck true forever and no redirect, which is exactly
      // "can't sign out" from the user's side even though the intent
      // succeeded locally. `scope: 'local'` only clears the browser's own
      // session/cookies -- no network call -- so it can't fail the same way.
      console.error('Sign out request to the server failed; clearing local session only.', err);
      await createClient()
        .auth.signOut({ scope: 'local' })
        .catch(() => undefined);
    } finally {
      setLoading(false);
    }
    // A hard navigation, not router.push: it clears all client-side query
    // cache and component state instead of leaving stale authenticated
    // data rendered behind a now-invalid session. Runs regardless of which
    // branch above ran -- the local session is cleared either way, so the
    // user should always land on /login, never stay stuck on this button.
    router.refresh();
    router.push('/login');
  }

  return (
    // Default size, not `size="sm"` -- bumped 2026-09-18 ("refactor the
    // logout button. That seem like not UI/UX design") to match the
    // other action buttons on the Settings page it now sits alongside
    // (NotificationSettings' "Turn on/off for this device" buttons are
    // both default-sized); it had been the one visibly smaller,
    // lower-weight button on the page for no reason tied to its own
    // importance. Kept `variant="outline"` rather than `destructive` --
    // signing out doesn't destroy anything, so a plain outline (the same
    // variant the push-notification "Turn off" button already uses)
    // reads as a normal action, not a dangerous one.
    <Button variant="outline" onClick={handleSignOut} disabled={loading}>
      {loading ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
