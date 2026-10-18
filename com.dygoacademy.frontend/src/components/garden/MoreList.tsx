import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { ChevronRightIcon } from './icons';

/**
 * "Want a little more?" (canvas `reference/A1b-all-watered`,
 * `reference/A1c-today-done`): a heading over one card of link rows, each
 * a 38px icon well, a bold title and a muted line, then a chevron. Shared
 * by A1b All watered and A1 when the missions are done but words are still
 * thirsty (A1c), so both stay identical. Props only.
 */
export interface MoreRow {
  key: string;
  href: string;
  icon: React.ReactNode;
  title: string;
  meta: string;
  /** Icon well colour: forest (default) or water (A1c "Water N thirsty words"). */
  tone?: 'forest' | 'water';
}

const WELL: Record<NonNullable<MoreRow['tone']>, string> = {
  forest: 'bg-forest-wash text-forest',
  water: 'bg-water-soft',
};

export function MoreList({ rows, className }: { rows: readonly MoreRow[]; className?: string }) {
  const t = useTranslations('screens.allWatered');
  return (
    <section className={gcn('flex flex-col gap-1.5', className)}>
      <h2 className="font-display text-[18px] font-semibold">{t('more')}</h2>
      <ul className="flex flex-col rounded-[20px] border border-border bg-surface px-[14px] py-0.5">
        {rows.map((row, index) => (
          <li key={row.key} className={gcn(index > 0 && 'border-t border-divider')}>
            <Link href={row.href} className="flex min-h-14 items-center gap-3 text-text">
              <span
                aria-hidden="true"
                className={gcn(
                  'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full',
                  WELL[row.tone ?? 'forest'],
                )}
              >
                {row.icon}
              </span>
              <span className="flex flex-grow flex-col">
                <span className="text-[15px] font-bold">{row.title}</span>
                <span className="text-[12px] text-muted-foreground">{row.meta}</span>
              </span>
              <ChevronRightIcon width={16} height={16} stroke="var(--color-text-muted)" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Plant 5 new words": a seed with a curl of sprout (canvas 19px, stroke 2.1). */
export function SeedIcon() {
  return (
    <svg
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <ellipse cx="12" cy="15" rx="5" ry="3.5" />
      <path d="M12 11.5 C12 8 14 6 17 5" />
    </svg>
  );
}
