'use client';

import Link from 'next/link';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { ROUTES } from '@/constants/routes';

const NAV_LINKS = [
  { href: ROUTES.home, label: 'Home' },
  { href: ROUTES.topics, label: 'Topics' },
  { href: ROUTES.groups, label: 'Groups' },
  { href: ROUTES.analytics, label: 'Progress' },
] as const;

/**
 * Authenticated shell header. The wireframe named four tabs (Home
 * (due-now, 1d) / Topics (grid, 1f) / Progress / You; no persistent Study
 * tab, since a review session is entered contextually from the
 * DueNowCard's "Start review," not kept as standing navigation), but
 * "Groups" wasn't one of them because no group-management frontend
 * existed at all until this pass -- every roster/invite screen (turns 3,
 * 4, 8g) was wireframe-only. Added as its own tab rather than nested under
 * an existing one since it's a peer concept to Topics, not a subsection of
 * it. "You" was dropped from this list once the account icon below started
 * linking to the same /settings route -- keeping both was two links to one
 * destination. "Home" was dropped once the logo below started linking to
 * ROUTES.home -- it used to point at ROUTES.home too, but back then
 * ROUTES.home meant '/', the *public guest landing page* (src/app/page.tsx,
 * "try one word before signing up"), a completely different screen from
 * the due-now dashboard "Home" pointed to; that mismatch meant the logo
 * and the Home tab could not simply collapse into each other until the
 * logo's target changed too. The 2026-09-17 URL reshuffle (constants/
 * routes.ts's header) resolved that the other way round: ROUTES.home now
 * *is* the due-now dashboard's URL ("/"), and the old guest landing page
 * moved out to ROUTES.search ("/search") -- NAV_LINKS' own Topics entry
 * below moved from ROUTES.topicsBrowse to ROUTES.topics the same pass,
 * since ROUTES.topics now means the grid that constant used to hold.
 * Route names (topics/analytics/settings) don't match the tab labels 1:1
 * -- see dygo_academy_frontend_architecture.md §15 for why the routes kept
 * their existing technical names. A real Sidebar/UserDropdown, per the
 * tech spec's component tree, is still open; this is deliberately a flat
 * link row.
 *
 * Rebuilt onto shadcn/ui's Radix Navigation Menu 2026-09-17, same pass
 * and same request as `PublicNavbar` ("apply that menu from radix ui to
 * my menu") -- `ui/navigation-menu.tsx`'s own header comment already
 * named this file as a second intended consumer when it was added
 * earlier the same day for `PublicNavbar` alone. Was a plain `<nav>` of
 * bare `<Link>`s plus a second, separately-styled `<nav>` for the
 * Profile link; both are now `NavigationMenuItem`s in one shared
 * `NavigationMenuList` -- the old two-`<nav>` split existed only to give
 * Profile the same `text-sm text-muted-foreground hover:text-foreground`
 * look as the tab links without literally sharing a parent, which
 * `navigationMenuTriggerStyle()` (hover/focus states, transition-colors)
 * already gives every item for free, so the split no longer earns its
 * keep. `'use client'` for the same reason as `PublicNavbar`:
 * `navigationMenuTriggerStyle()` is a plain `cva()` call, not a
 * component, and calling it from server-rendered code throws
 * ("Attempted to call navigationMenuTriggerStyle() from the server");
 * `Navbar` is still composed from `(dashboard)/layout.tsx`, a Server
 * Component that resolves `userEmail` server-side, which is unaffected --
 * only rendering/calling a Client Component's exports from *within*
 * server code is restricted, not a Server Component using one as a
 * child. `NavigationMenu`'s own default classes include `flex-1` (grow
 * to fill its flex parent); overridden here to `flex-none` to preserve
 * the centered-group header layout from the 2026-09-04 live-reported
 * fix below -- an unconstrained `flex-1` menu would re-introduce the
 * edge-pinned/off-center look that fix specifically walked back.
 *
 * Explicit "Home" tab added back to `NAV_LINKS` 2026-09-19 (Phase 2
 * FR-16.2 -- UX audit finding: the only way back to the dashboard was
 * the "Dygo" wordmark below, which "carries no link affordance (no
 * hover state, no underline)" and reads as unlabeled plain-centered text
 * on mobile). This re-adds the exact tab this file's own history above
 * says was dropped as "redundant" once the logo started linking to
 * ROUTES.home -- the logo link still works and still points there, this
 * is purely about giving mobile users (and anyone who doesn't recognize
 * a wordmark as clickable) an explicit, labeled way back, per the FR's
 * acceptance criteria.
 *
 * Header changed from a plain `border-b` row to `sticky top-0 z-10
 * bg-background` 2026-09-19 (Phase 2 FR-16.1 -- audit finding: the nav
 * scrolled away with page content, so a long page (20-word topic list,
 * group admin panel, full heatmap) required scrolling back to the top to
 * switch sections). `bg-background` (not a hardcoded color) is the same
 * token `globals.css` already applies to `<body>`, so the sticky header
 * matches the page background in both light and dark mode instead of
 * showing page content through a transparent bar while scrolled.
 */
export function Navbar({ userEmail }: { userEmail: string }) {
  return (
    // Logo, nav and account icon as one centered group -- was a 3-column
    // grid (logo pinned left, icon pinned right, only the nav centered
    // between them), which read as "off-center" overall since the logo
    // and icon still sat at opposite screen edges (live-reported
    // 2026-09-04). `flex-wrap` lets the group drop to a second centered
    // line on a very narrow phone instead of overflowing, rather than
    // reserving edge columns for logo/icon the way the grid did.
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-center gap-4 border-b bg-background px-4 py-3 sm:gap-6 sm:px-6">
      {/* Doubles as the "Home" link -- was the old ROUTES.home ('/', the
          public guest landing page, now ROUTES.search) until the
          standalone "Home" nav tab (the due-now dashboard) was dropped as
          redundant; this now points where that tab used to, and since the
          2026-09-17 reshuffle that destination *is* ROUTES.home. */}
      <Link href={ROUTES.home} className="truncate font-bold">
        Dygo
      </Link>
      <NavigationMenu className="max-w-none flex-none">
        <NavigationMenuList className="flex-wrap justify-center gap-1">
          {NAV_LINKS.map((link) => (
            <NavigationMenuItem key={link.href}>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href={link.href}>{link.label}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
          {/* Sign out still lives on the Settings page this links to (see
              history above), so this remains the header's only
              account-related element. Full email stays available via the
              native title tooltip and the accessible name. */}
          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={navigationMenuTriggerStyle()}
              title={userEmail}
              aria-label={`Account: ${userEmail}`}
            >
              <Link href={ROUTES.settings}>Profile</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
}
