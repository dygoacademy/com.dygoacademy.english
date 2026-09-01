import Link from 'next/link';

import { SignOutButton } from '@/components/layout/SignOutButton';
import { ROUTES } from '@/constants/routes';

const NAV_LINKS = [
  { href: ROUTES.topics, label: 'Home' },
  { href: ROUTES.topicsBrowse, label: 'Topics' },
  { href: ROUTES.groups, label: 'Groups' },
  { href: ROUTES.analytics, label: 'Progress' },
  { href: ROUTES.settings, label: 'You' },
] as const;

/**
 * Authenticated shell header. Five tabs — the wireframe named four (Home
 * (due-now, 1d) / Topics (grid, 1f) / Progress / You; no persistent Study
 * tab, since a review session is entered contextually from the
 * DueNowCard's "Start review," not kept as standing navigation), but
 * "Groups" wasn't one of them because no group-management frontend
 * existed at all until this pass — every roster/invite screen (turns 3,
 * 4, 8g) was wireframe-only. Added as its own tab rather than nested under
 * an existing one since it's a peer concept to Topics, not a subsection of
 * it. Route names (topics/analytics/settings) don't match the tab labels
 * 1:1 — see dygo_academy_frontend_architecture.md §15 for why the routes
 * kept their existing technical names. A real Sidebar/UserDropdown, per
 * the tech spec's component tree, is still open; this is deliberately a
 * flat link row.
 */
export function Navbar({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href={ROUTES.home} className="font-semibold">
          Dygo Academy
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userEmail}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
