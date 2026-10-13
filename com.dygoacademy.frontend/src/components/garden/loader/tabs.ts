import type { GardenTab } from '../screens/GardenTabBar';

/**
 * Which tab a path belongs to, for the loading screen (LD3b): the tab bar is
 * shown while a screen that has one is loading, with that tab highlighted.
 * `null` = the screen has no tab bar (Review, Quiz, Speak, Pronounce, Join,
 * onboarding, sign-in, the dev pages under /garden/_…), so the loader fills
 * the whole screen. The list follows the screens that render `GardenTabBar`
 * today, minus the ones the design leaves without it (docs/plans/Loading
 * screen LD3b implementation plan.md §1).
 */
export function tabFor(pathname: string | null | undefined): GardenTab | null {
  const path = (pathname ?? '').split(/[?#]/)[0] ?? '';
  const parts = path.split('/').filter(Boolean);
  const first = parts[0];
  if (first === 'garden') return parts.length === 1 ? 'garden' : null;
  if (first === 'missions') return parts.length === 1 ? 'missions' : null;
  if (first === 'topics') return 'topics';
  if (first === 'groups') return 'groups';
  if (first === 'me') return 'me';
  return null;
}

export function hasTabBar(pathname: string | null | undefined): boolean {
  return tabFor(pathname) !== null;
}
