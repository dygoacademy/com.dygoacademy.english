import Link from 'next/link';

import { SignOutButton } from '@/components/layout/SignOutButton';
import { ROUTES } from '@/constants/routes';

/**
 * Authenticated shell header. Deliberately minimal for Phase 0 — real
 * navigation links (Topics, Study, Analytics, Settings) and the
 * Sidebar/UserDropdown named in the tech spec's component tree land
 * alongside the screens they navigate to, in Phase 1+. What's here now
 * exists to make the (dashboard) auth guard demonstrable end to end: a
 * signed-in user has a way to see who they are and sign out.
 */
export function Navbar({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <Link href={ROUTES.home} className="font-semibold">
        Dygo Academy
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userEmail}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
