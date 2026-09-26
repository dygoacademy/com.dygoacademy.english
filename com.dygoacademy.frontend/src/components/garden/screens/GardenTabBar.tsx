import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';

import { BottomTabBar } from '../BottomTabBar';
import { GroupsTabIcon } from '../groupArt';
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
 * only for learners in at least one shared garden. The GR-screens pass
 * `groups`; the A-screens keep four tabs until the live wiring (UI-G 3).
 */
export function GardenTabBar({
  active,
  sticky = true,
  groups,
}: {
  active: GardenTab;
  sticky?: boolean;
  /** Show the Groups tab. */
  groups?: boolean;
}) {
  const showGroups = groups ?? false;
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
  return (
    <BottomTabBar
      items={items}
      activeKey={active}
      className={sticky ? 'sticky bottom-0 mt-auto' : 'mt-auto'}
    />
  );
}

/** Screen column: the canvas frame (390 wide on iPhone), full height. */
export const SCREEN_CLASSES =
  'mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col bg-garden-bg text-garden-text';
