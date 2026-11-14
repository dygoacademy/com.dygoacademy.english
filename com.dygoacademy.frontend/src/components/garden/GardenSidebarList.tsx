import Link from 'next/link';

import { gcn } from './cn';
import { GardenTabIcon } from './icons';

/**
 * The master list of the iPad master–detail views (design system §10, A6:
 * "Topics list in the sidebar + selected bed on the right"; the same for
 * shared gardens), and iA8's "Shared gardens" list. Rendered under
 * `GardenSidebar`'s tabs, so it only shows at `lg` with the iPad nav on.
 *
 * Canvas `reference/iA8-me`: an uppercase 12px heading, then 44px rows
 * (15px semibold) with an optional 26px letter avatar and a water badge.
 * The open item is forest + bold + `aria-current="page"`, like the tabs.
 */
export interface GardenSidebarListItem {
  id: string;
  href: string;
  label: string;
  /** Short trailing text, e.g. the words due. */
  badge?: string | null;
  /** A letter avatar before the label (iA8 shared gardens). */
  avatar?: string;
}

export function GardenSidebarList({
  label,
  items,
  activeId = null,
  heading = false,
}: {
  /** Names the list (e.g. "Topics"); shown as its heading with `heading`. */
  label: string;
  items: readonly GardenSidebarListItem[];
  activeId?: string | null;
  /** Show `label` over the list (iA8 "Shared gardens"). */
  heading?: boolean;
}) {
  if (items.length === 0) return null;
  const list = (
    <ul
      aria-label={heading ? undefined : label}
      className={gcn(
        'flex min-h-0 flex-col gap-1.5 overflow-y-auto',
        !heading && 'mt-3 border-t border-divider pb-4 pt-3',
      )}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={gcn(
                'flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[15px]',
                active ? 'bg-forest font-bold text-white' : 'font-semibold text-text',
              )}
            >
              {item.avatar ? (
                <span
                  aria-hidden="true"
                  className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[13px] bg-stage-due text-[12px] font-bold text-avatar-due-text"
                >
                  {item.avatar}
                </span>
              ) : null}
              <span className="min-w-0 flex-grow truncate">{item.label}</span>
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
  if (!heading) return list;
  return (
    <section aria-label={label} className="flex min-h-0 flex-col gap-1.5">
      <h2 className="px-3 pb-1.5 pt-[22px] text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">
        {label}
      </h2>
      {list}
    </section>
  );
}

/** iA8: the streak card at the bottom of the sidebar (a sprout, the streak, the rain barrels left). */
export function GardenSidebarStreak({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-control border border-border bg-surface px-[14px] py-3">
      <GardenTabIcon width={24} height={24} stroke="var(--color-success)" className="shrink-0" />
      <span className="flex flex-col leading-[1.2]">
        <span className="text-[15px] font-bold">{title}</span>
        <span className="text-[12px] text-muted-foreground">{detail}</span>
      </span>
    </div>
  );
}
