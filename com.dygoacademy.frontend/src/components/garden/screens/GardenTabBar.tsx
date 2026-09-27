import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES, isGardenIpadNavOn } from '@/constants/garden';

import { BottomTabBar } from '../BottomTabBar';
import { gcn } from '../cn';
import { GardenRail } from '../GardenRail';
import { GardenSidebar } from '../GardenSidebar';
import { GroupsTabIcon } from '../groupArt';
import { useGroupsTab } from '../groupsTab';
import { GardenTabIcon, MeTabIcon, MissionsTabIcon, TopicsTabIcon } from '../icons';

export type GardenTab = 'garden' | 'missions' | 'topics' | 'groups' | 'me';

/**
 * The garden's four tabs (canvas nav), last in the screen's column
 * (`mt-auto`). `sticky` keeps it on screen when the page scrolls, which the
 * live routes want; the canvas frame is fixed-height, so the reference
 * pages render it in the flow (on A8 the canvas pushes it 3px past the
 * bottom edge, and the pixel diff should see exactly that).
 *
 * UI-G (plan decision 9): a fifth tab, "Groups", between Topics and Me,
 * only for learners in at least one shared garden. Screens get `groups`
 * from `useGroupsTab()` (live) or pass it themselves (reference pages:
 * the A-screens keep four tabs, the GR-screens show five).
 *
 * UI-3 U3-2: with NEXT_PUBLIC_GARDEN_IPAD_NAV on, the same items also render
 * as `GardenRail` (600–1023px) and `GardenSidebar` (≥ 1024px), and the tab
 * bar hides from 600px up. Off (the default), the output is unchanged.
 */
export function GardenTabBar({
  active,
  sticky = true,
  groups,
  ipadNav = isGardenIpadNavOn(),
}: {
  active: GardenTab;
  sticky?: boolean;
  /** Show the Groups tab. Defaults to what `GroupsTabProvider` says (off without one). */
  groups?: boolean;
  /** iPad rail / sidebar. Defaults to NEXT_PUBLIC_GARDEN_IPAD_NAV. */
  ipadNav?: boolean;
}) {
  const fromContext = useGroupsTab();
  const showGroups = groups ?? fromContext;
  const t = useTranslations('components.tabBar');
  const items = [
    { key: 'garden', href: GARDEN_ROUTES.home, label: t('garden'), icon: <GardenTabIcon /> },
    {
      key: 'missions',
      href: GARDEN_ROUTES.missions,
      label: t('missions'),
      icon: <MissionsTabIcon />,
    },
    { key: 'topics', href: GARDEN_ROUTES.topics, label: t('topics'), icon: <TopicsTabIcon /> },
    ...(showGroups || active === 'groups'
      ? [{ key: 'groups', href: GARDEN_ROUTES.groups, label: t('groups'), icon: <GroupsTabIcon /> }]
      : []),
    { key: 'me', href: GARDEN_ROUTES.me, label: t('me'), icon: <MeTabIcon /> },
  ];
  const tabBarClasses = sticky ? 'sticky bottom-0 mt-auto' : 'mt-auto';
  if (!ipadNav) {
    return <BottomTabBar items={items} activeKey={active} className={tabBarClasses} />;
  }
  return (
    <>
      <BottomTabBar
        items={items}
        activeKey={active}
        className={gcn(tabBarClasses, 'medium:hidden')}
      />
      <GardenRail items={items} activeKey={active} />
      <GardenSidebar items={items} activeKey={active} />
    </>
  );
}

/** Screen column: the canvas frame (390 wide on iPhone), full height. */
export const SCREEN_CLASSES =
  'mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col bg-garden-bg text-garden-text';
