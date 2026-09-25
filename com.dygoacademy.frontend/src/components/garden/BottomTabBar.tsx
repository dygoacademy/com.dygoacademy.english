import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';

/**
 * Bottom tab bar (design system §9.2, §11): four items, 24px icon +
 * `label`, 56px tall plus the home-indicator safe area. The active tab
 * is marked with `aria-current="page"`, a forest pill behind the icon
 * and a bold forest label (not colour alone).
 *
 * Props only: the (garden) shell in UI-3 passes the items and works out
 * which one is active. `fixed={false}` renders it in the flow (gallery).
 * On iPad it becomes a rail / sidebar (UI-3, switched on in UI-7).
 */
export interface TabItem {
  key: string;
  href: string;
  label: string;
  /** Decorative 24px icon, e.g. <GardenTabIcon />. */
  icon: React.ReactNode;
}

export interface BottomTabBarProps {
  items: readonly TabItem[];
  activeKey: string | null;
  fixed?: boolean;
  className?: string;
}

export function BottomTabBar({ items, activeKey, fixed = true, className }: BottomTabBarProps) {
  const t = useTranslations('components.tabBar');
  return (
    <nav
      aria-label={t('label')}
      className={gcn(
        'z-40 border-t border-garden-border bg-garden-surface pb-safe pl-safe pr-safe',
        fixed && 'fixed inset-x-0 bottom-0',
        className,
      )}
    >
      <ul
        className="mx-auto grid h-14 max-w-[560px]"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={gcn(
                  'flex h-14 min-w-11 flex-col items-center justify-center gap-0.5 px-1 text-label',
                  active ? 'font-bold text-garden-forest' : 'font-semibold text-garden-muted',
                )}
              >
                <span
                  aria-hidden="true"
                  className={gcn(
                    'inline-flex h-7 w-14 items-center justify-center rounded-full transition-colors duration-quick ease-garden [&_svg]:h-6 [&_svg]:w-6',
                    active ? 'bg-garden-forest text-white' : 'text-garden-muted',
                  )}
                >
                  {item.icon}
                </span>
                <span className="max-w-full truncate leading-tight">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
