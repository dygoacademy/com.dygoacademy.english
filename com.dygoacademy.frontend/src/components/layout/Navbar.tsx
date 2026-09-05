import Link from 'next/link';

import { ROUTES } from '@/constants/routes';

const NAV_LINKS = [
  { href: ROUTES.topicsBrowse, label: 'Topics' },
  { href: ROUTES.groups, label: 'Groups' },
  { href: ROUTES.analytics, label: 'Progress' },
] as const;

/**
 * Authenticated shell header. The wireframe named four tabs (Home
 * (due-now, 1d) / Topics (grid, 1f) / Progress / You; no persistent Study
 * tab, since a review session is entered contextually from the
 * DueNowCard's "Start review," not kept as standing navigation), but
 * "Groups" wasn't one of them because no group-management frontend
 * existed at all until this pass — every roster/invite screen (turns 3,
 * 4, 8g) was wireframe-only. Added as its own tab rather than nested under
 * an existing one since it's a peer concept to Topics, not a subsection of
 * it. "You" was dropped from this list once the account icon below started
 * linking to the same /settings route -- keeping both was two links to one
 * destination. "Home" was dropped once the logo below started linking to
 * ROUTES.topics -- it used to point at ROUTES.home ('/'), the *public
 * guest landing page* (src/app/page.tsx, "try one word before signing
 * up"), a completely different screen from the due-now dashboard "Home"
 * pointed to; that mismatch meant the logo and the Home tab could not
 * simply collapse into each other until the logo's target changed too.
 * Route names (topics/analytics/settings) don't match the tab labels 1:1
 * — see dygo_academy_frontend_architecture.md §15 for why the routes kept
 * their existing technical names. A real Sidebar/UserDropdown, per the
 * tech spec's component tree, is still open; this is deliberately a flat
 * link row.
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
    <header className="flex flex-wrap items-center justify-center gap-4 border-b px-4 py-3 sm:gap-6 sm:px-6">
      {/* Doubles as the "Home" link -- was ROUTES.home ('/', the public
          guest landing page) until the standalone "Home" nav tab
          (ROUTES.topics, the due-now dashboard) was dropped as redundant;
          this now points where that tab used to. */}
      <Link href={ROUTES.topics} className="truncate font-semibold">
        Dygo Academy
      </Link>
      <nav className="flex items-center gap-3 overflow-x-auto text-sm text-muted-foreground sm:gap-4">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
      {/* Was a circular letter-avatar (first char of the email); changed
          to a plain "Profile" text link to match the other nav items --
          live-requested 2026-09-05, then asked to match the Progress
          link's style exactly (2026-09-05 follow-up): same classes as
          the NAV_LINKS items above (shrink-0 hover:text-foreground),
          picking up text-sm/text-muted-foreground from the <nav> those
          share -- no transition-colors, since Progress/Groups/Topics
          don't have one either. Sign out still lives on the Settings
          page this links to (see history above), so this remains the
          header's only account-related element. Full email stays
          available via the native title tooltip and the accessible name. */}
      <nav className="flex items-center text-sm text-muted-foreground">
        <Link
          href={ROUTES.settings}
          title={userEmail}
          aria-label={`Account: ${userEmail}`}
          className="shrink-0 hover:text-foreground"
        >
          Profile
        </Link>
      </nav>
    </header>
  );
}
