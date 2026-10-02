import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { GroupRole } from '@/types';

import { gcn } from './cn';
import { AvatarStack, type GardenerTone } from './GardenerAvatar';
import { TilePlant, type GroupTilePlant } from './groupArt';
import { RoleBadge } from './RoleBadge';

/**
 * One shared garden in the list (canvas GR1): a 56px forest tile with the
 * garden's plant, the name with your role, the counts line, a few
 * gardeners' initials, and how many of the garden's words are due for
 * you ("All watered" at 0). `due: null` hides the badge (unknown).
 *
 * Avatars are only the gardeners the API lets you see (a Viewer sees
 * themself); the counts line carries the real number.
 */
export interface GroupCardProps {
  href: string;
  name: string;
  role: GroupRole;
  /** Pre-formatted counts line: "5 gardeners · 3 shared beds · 126 words". */
  meta: string;
  plant: GroupTilePlant;
  avatars: ReadonlyArray<{ text: string; tone: GardenerTone }>;
  due: number | null;
  className?: string;
}

export function GroupCard({ href, name, role, meta, plant, avatars, due, className }: GroupCardProps) {
  const t = useTranslations('components.groups');
  return (
    <Link
      href={href}
      className={gcn(
        'flex items-center gap-3 rounded-[20px] border border-border bg-surface py-3 pl-2.5 pr-[14px] text-text',
        'transition-colors duration-quick ease-garden hover:border-muted-foreground active:bg-surface-sunken',
        className,
      )}
    >
      <span className="flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden rounded-control bg-forest">
        <TilePlant plant={plant} />
      </span>
      <span className="flex min-w-0 flex-grow flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[16px] font-bold">
            {name}
          </span>
          <RoleBadge role={role} />
        </span>
        <span className="text-[12px] text-muted-foreground">{meta}</span>
        <span className="flex items-center justify-between">
          <AvatarStack avatars={avatars} />
          {due === null ? null : due > 0 ? (
            <span className="rounded-[10px] bg-water-soft px-2 py-[3px] text-[12px] font-bold text-water-text">
              {t('dueForYou', { count: due })}
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-success">{t('allWatered')}</span>
          )}
        </span>
      </span>
    </Link>
  );
}
