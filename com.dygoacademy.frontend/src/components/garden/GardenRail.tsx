import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { TabItem } from './BottomTabBar';
import { gcn } from './cn';

/**
 * iPad side rail (design system §2.3 / §7: `medium`, 600–1023px): 80px wide,
 * the same 4/5 tabs as the bottom tab bar, a 24px icon over a 12px label.
 * Active is forest + bold + `aria-current="page"`, like the tab bar.
 *
 * Only shown when NEXT_PUBLIC_GARDEN_IPAD_NAV is on (UI-3 U3-2; UI-7 turns
 * it on). By default it is fixed to the left edge and visible only at
 * `medium` (hidden below 600px and at `expanded`, where the sidebar takes
 * over); `inline` renders it in the flow at any width (gallery).
 */
export interface GardenRailProps {
  items: readonly TabItem[];
  activeKey: string | null;
  inline?: boolean;
  className?: string;
}

export function GardenRail({ items, activeKey, inline = false, className }: GardenRailProps) {
  const t = useTranslations('components.tabBar');
  return (
    <nav
      aria-label={t('label')}
      data-garden-nav={inline ? undefined : 'rail'}
      className={gcn(
        'w-20 flex-col border-r border-garden-border bg-garden-surface pt-[max(16px,var(--safe-top))]',
        inline
          ? 'flex min-h-[360px]'
          : 'fixed inset-y-0 left-0 z-40 hidden pl-[var(--safe-left)] medium:flex expanded:hidden',
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
                  'mx-2 flex flex-col items-center gap-[3px] rounded-tile py-2',
                  active ? 'bg-garden-bg text-garden-forest' : 'text-garden-muted',
                )}
              >
                <span aria-hidden="true" className="flex [&_svg]:h-6 [&_svg]:w-6">
                  {item.icon}
                </span>
                <span
                  className={gcn(
                    'max-w-full truncate text-[12px]',
                    active ? 'font-bold' : 'font-medium',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
