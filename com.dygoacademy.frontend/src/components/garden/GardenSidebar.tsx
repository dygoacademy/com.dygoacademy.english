import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { TabItem } from './BottomTabBar';
import { gcn } from './cn';
import { GardenTabIcon } from './icons';

/**
 * iPad sidebar (design system §2.3 / §7: `expanded`, ≥ 1024px; canvas
 * `reference/iA8-me`): 264px on the sand panel, the Dygo mark, then the
 * same 4/5 tabs as the bottom tab bar (44px rows, 22px icon beside a 16px
 * label). Active is filled forest with white text + `aria-current="page"`.
 * `footer` sits at the bottom (the iA8 streak card).
 *
 * The topic-bed list under Topics (§7) needs live data and comes with UI-7;
 * `children` renders below the items for it.
 *
 * Only shown when NEXT_PUBLIC_GARDEN_IPAD_NAV is on (UI-3 U3-2). By default
 * it is fixed to the left edge and visible only at `expanded`; `inline`
 * renders it in the flow at any width (gallery).
 */
export interface GardenSidebarProps {
  items: readonly TabItem[];
  activeKey: string | null;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Pinned to the bottom of the sidebar (iA8: the streak card). */
  footer?: React.ReactNode;
}

export function GardenSidebar({
  items,
  activeKey,
  inline = false,
  className,
  children,
  footer,
}: GardenSidebarProps) {
  const t = useTranslations('components.tabBar');
  return (
    <nav
      aria-label={t('label')}
      data-garden-nav={inline ? undefined : 'sidebar'}
      className={gcn(
        'w-[264px] flex-col gap-1.5 border-r border-border bg-sidebar pb-7 pr-4 pt-[max(32px,var(--safe-top))]',
        inline
          ? 'flex min-h-[360px] pl-4'
          : 'fixed inset-y-0 left-0 z-40 hidden pl-[max(16px,var(--safe-left))] lg:flex',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-3 pb-[18px]">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-forest"
        >
          <GardenTabIcon width={22} height={22} stroke="var(--stage-sprout)" />
        </span>
        <span className="font-display text-[22px] font-semibold">{t('brand')}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={gcn(
                  'flex h-11 items-center gap-3 rounded-[12px] px-3 text-[16px] font-semibold',
                  active ? 'bg-forest text-white' : 'text-text',
                )}
              >
                <span aria-hidden="true" className="flex [&_svg]:h-[22px] [&_svg]:w-[22px]">
                  {item.icon}
                </span>
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {children}
      {footer ? <div className="mt-auto">{footer}</div> : null}
    </nav>
  );
}
