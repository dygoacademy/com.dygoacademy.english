import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { TabItem } from './BottomTabBar';
import { gcn } from './cn';

/**
 * iPad sidebar (design system §2.3 / §7: `expanded`, ≥ 1024px): 240px wide,
 * the same 4/5 tabs as the bottom tab bar, icon beside label. Active is
 * forest + bold + `aria-current="page"`.
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
}

export function GardenSidebar({
  items,
  activeKey,
  inline = false,
  className,
  children,
}: GardenSidebarProps) {
  const t = useTranslations('components.tabBar');
  return (
    <nav
      aria-label={t('label')}
      data-garden-nav={inline ? undefined : 'sidebar'}
      className={gcn(
        'w-60 flex-col border-r border-garden-border bg-garden-surface px-3 pt-[max(16px,var(--safe-top))]',
        inline
          ? 'flex min-h-[360px]'
          : 'fixed inset-y-0 left-0 z-40 hidden pl-[max(12px,var(--safe-left))] expanded:flex',
        className,
      )}
    >
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={gcn(
                  'flex items-center gap-3 rounded-control px-3 py-2.5 text-[15px]',
                  active
                    ? 'bg-garden-bg font-bold text-garden-forest'
                    : 'font-medium text-garden-muted',
                )}
              >
                <span aria-hidden="true" className="flex [&_svg]:h-6 [&_svg]:w-6">
                  {item.icon}
                </span>
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {children}
    </nav>
  );
}
