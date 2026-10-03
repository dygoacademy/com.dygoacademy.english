import Link from 'next/link';

import { gcn } from './cn';

/**
 * The master list of the iPad master–detail views (design system §10, A6:
 * "Topics list in the sidebar + selected bed on the right"; the same for
 * shared gardens). Rendered under `GardenSidebar`'s tabs, so it only
 * shows at `lg` with the iPad nav on. The open item is forest + bold +
 * `aria-current="page"`, like the tabs above it.
 */
export interface GardenSidebarListItem {
  id: string;
  href: string;
  label: string;
  /** Short trailing text, e.g. the words due. */
  badge?: string | null;
}

export function GardenSidebarList({
  label,
  items,
  activeId = null,
}: {
  /** Names the list for screen readers (e.g. "Topics"). */
  label: string;
  items: readonly GardenSidebarListItem[];
  activeId?: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <ul
      aria-label={label}
      className="mt-3 flex min-h-0 flex-col gap-0.5 overflow-y-auto border-t border-divider pb-4 pt-3"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={gcn(
                'flex min-h-11 items-center justify-between gap-2 rounded-control px-3 py-2 text-[14px]',
                active ? 'bg-bg font-bold text-forest' : 'font-medium text-text',
              )}
            >
              <span className="min-w-0 truncate">{item.label}</span>
              {item.badge ? (
                <span className="shrink-0 rounded-[10px] bg-water-soft px-2 py-[2px] text-[12px] font-bold text-water-text">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
