import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';

/**
 * Bottom tab bar (canvas): four items, a 24px icon over a 12px label,
 * white with a top border, 8px padding and 20px at the bottom (or the
 * home-indicator inset, whichever is larger). The active tab is forest
 * with a bold label and `aria-current="page"`; the others are muted with
 * a medium label (weight and colour, so not colour alone).
 *
 * Props only: the screen passes the items and the active key. By default
 * it sits in the flow at the end of the screen (`mt-auto`, as in the
 * canvas); `fixed` pins it to the bottom of the viewport.
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

export function BottomTabBar({ items, activeKey, fixed = false, className }: BottomTabBarProps) {
  const t = useTranslations('components.tabBar');
  return (
    <nav
      aria-label={t('label')}
      className={gcn(
        'z-40 border-t border-garden-border bg-garden-surface pt-2',
        'pb-[max(20px,var(--safe-bottom))] pl-[max(8px,var(--safe-left))] pr-[max(8px,var(--safe-right))]',
        fixed && 'fixed inset-x-0 bottom-0',
        className,
      )}
    >
      <ul
        className="mx-auto grid max-w-[560px]"
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
                  'flex flex-col items-center gap-[3px] py-1.5',
                  active ? 'text-garden-forest' : 'text-garden-muted',
                )}
              >
                <span aria-hidden="true" className="flex [&_svg]:h-6 [&_svg]:w-6">
                  {item.icon}
                </span>
                <span
                  className={gcn(
                    'max-w-full whitespace-nowrap text-[12px]',
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
