import Link from 'next/link';

import { ROUTES } from '@/constants/routes';

/**
 * Header for the public/guest side of the app — currently just `/search`
 * (`app/search/page.tsx`). Added 2026-09-17 alongside the middleware
 * change that now sends an anonymous visitor hitting "/" here instead of
 * to `/login` ("redirect them to search page with menu"): before this,
 * `/search` was a bare centered card with no way back to `/login` except
 * typing the URL directly -- GuestWordTrial's own CTAs all point at
 * ROUTES.register (create an account), never at signing back in.
 *
 * Originally rebuilt onto shadcn/ui's Radix Navigation Menu the same day
 * ("follow mobi first and follow radix-ui component rather then build by
 * yourself"), then centered as a logo+menu group the day after ("change
 * Menu align in the center and use radix ui") -- see this file's git
 * history for that version if the Navigation Menu treatment is ever
 * needed again.
 *
 * The "Sign in" link that Navigation Menu wrapped was moved out of this
 * header entirely 2026-09-18 ("move login button to search group in the
 * search page") and now lives in `GuestWordTrial`'s card footer instead,
 * next to "Or just create a free account" -- both auth paths sit
 * together at the point where a guest is already deciding whether to
 * create an account, rather than the primary CTA being in one component
 * and the secondary one being all the way up in the header. That left
 * this header with a single static logo link and no interactive menu
 * item at all, so the Navigation Menu wrapper came out with it rather
 * than keeping an empty `<NavigationMenu>` shell around one `<Link>` --
 * add it back (see history above) if a real nav item lands here again.
 * Removing it also means this file no longer needs `'use client'`: that
 * was only required because `navigationMenuTriggerStyle()` is a
 * client-only `cva()` call (see `Navbar.tsx`'s own comment on the same
 * issue) -- with no Navigation Menu left, this is back to a plain Server
 * Component, composed directly from `app/search/page.tsx`.
 *
 * Deliberately its own component rather than a stripped-down mode of
 * `Navbar.tsx`: that one assumes a signed-in `userEmail` (it's rendered
 * from `(dashboard)/layout.tsx`, which redirects to /login before ever
 * rendering without a user), so branching it for a guest would mean
 * threading an optional prop through every one of its links instead of
 * just... not showing them.
 */
export function PublicNavbar() {
  return (
    <header className="flex flex-wrap items-center justify-center gap-4 border-b px-4 py-3 sm:gap-6 sm:px-6">
      <Link href={ROUTES.search} className="truncate font-bold">
        Dygo
      </Link>
    </header>
  );
}
