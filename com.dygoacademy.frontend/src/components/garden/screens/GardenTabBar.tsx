import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';

import { BottomTabBar } from '../BottomTabBar';
import { GardenTabIcon, MeTabIcon, MissionsTabIcon, TopicsTabIcon } from '../icons';

export type GardenTab = 'garden' | 'missions' | 'topics' | 'me';

/**
 * The garden's four tabs (canvas nav), last in the screen's column
 * (`mt-auto`). `sticky` keeps it on screen when the page scrolls, which the
 * live routes want; the canvas frame is fixed-height, so the reference
 * pages render it in the flow (on A8 the canvas pushes it 3px past the
 * bottom edge, and the pixel diff should see exactly that).
 */
export function GardenTabBar({ active, sticky = true }: { active: GardenTab; sticky?: boolean }) {
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
