'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { GroupRole } from '@/types';

import { gcn } from '../cn';
import { AvatarStack, type GardenerTone } from '../GardenerAvatar';
import { ManageIcon, SharedPlot, TilePlant, type GroupTilePlant } from '../groupArt';
import { BackIcon, PlusIcon } from '../icons';
import { IconButton } from '../IconButton';
import { RainDayBanner } from '../RainDayBanner';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';

/**
 * GR2 · Group garden (canvas `reference/GR2-group-garden`). Props only.
 *
 * Header (back, garden name, your role and the gardener count, a manage
 * button for admins) → the shared-plot hero (aggregates only: words the
 * garden grows, how many gardeners watered today, ripe plants out of all
 * plants) → this week's rain day, if any → the shared beds with your own
 * due words and stage shares → the gardeners' initials and Invite.
 *
 * Privacy (plan decision 10): nothing here is another learner's progress.
 * "4 of 5 watered today" and "412 of 630 ripe" are group totals; the beds'
 * bars and due counts are yours.
 */
export interface GroupGardenBed {
  id: string;
  href: string;
  title: string;
  words: number;
  level: string | null;
  plant: GroupTilePlant;
  /** Your due words in this bed; null = unknown (hidden). */
  due: number | null;
  /** Your stage shares, % of the bed's words (0–100); null hides the bar's fill. */
  shares: { tree: number; flower: number; sprout: number } | null;
}

export interface GroupGardenScreenProps {
  name: string;
  role: GroupRole;
  members: number;
  backHref: string;
  /** Admins only; null hides the button. */
  manageHref: string | null;
  hero: { words: number; watered: number; ripe: number; plants: number };
  rainDay: { words: number; done: number; mine: number; href: string } | null;
  beds: readonly GroupGardenBed[];
  avatars: ReadonlyArray<{ text: string; tone: GardenerTone }>;
  /** Admins only; null hides Invite. `onClick` (live sheet) wins over `href`. */
  invite: { href?: string; onClick?: () => void } | null;
  stickyNav?: boolean;
  /** Master list under the iPad sidebar's tabs at `lg` (GardenSidebarList). */
  sidebar?: React.ReactNode;
  children?: React.ReactNode;
}

const BACK_CLASSES = 'box-content';

export function GroupGardenScreen({
  name,
  role,
  members,
  backHref,
  manageHref,
  hero,
  rainDay,
  beds,
  avatars,
  invite,
  stickyNav = true,
  sidebar,
  children,
}: GroupGardenScreenProps) {
  const t = useTranslations('screens.groups.garden');
  const c = useTranslations('components.groups');

  const inviteClasses =
    'box-content flex h-10 shrink-0 items-center gap-1.5 rounded-[14px] border border-border bg-surface px-[14px] text-[14px] font-bold text-forest';

  return (
    <div className={gcn(SCREEN_CLASSES, IPAD_NAV_COLUMN, 'relative gap-3 pt-[22px]')}>
      <header className="flex items-center gap-3 px-4">
        <IconButton asChild aria-label={t('back')} className={BACK_CLASSES}>
          <Link href={backHref}>
            <BackIcon width={20} height={20} />
          </Link>
        </IconButton>
        <div className="flex min-w-0 flex-grow flex-col">
          <h1 className="font-display text-[22px] font-semibold leading-[1.1]">{name}</h1>
          <span className="text-[13px] text-muted-foreground">{t('subtitle', { role, members })}</span>
        </div>
        {manageHref ? (
          <IconButton asChild aria-label={t('manage')} className={BACK_CLASSES}>
            <Link href={manageHref}>
              <ManageIcon width={20} height={20} />
            </Link>
          </IconButton>
        ) : null}
      </header>

      <section className="mx-4 flex flex-col gap-1 overflow-hidden rounded-[24px] bg-forest px-4 pt-[14px] text-on-forest">
        <span className="text-[12px] font-semibold uppercase tracking-[.08em] text-stage-sprout">
          {t('eyebrow')}
        </span>
        <span className="font-display text-[22px] font-medium">
          {t('heroTitle', { count: hero.words })}
        </span>
        <div className="flex gap-[14px] text-[12px] text-on-forest-muted">
          <span className="flex items-center gap-[5px]">
            <span aria-hidden="true" className="h-2 w-2 rounded-[4px] bg-stage-due" />
            {t('watered', { watered: hero.watered, members })}
          </span>
          <span className="flex items-center gap-[5px]">
            <span aria-hidden="true" className="h-2 w-2 rounded-[4px] bg-stage-tree-fruit" />
            {t('ripe', { ripe: hero.ripe, total: hero.plants })}
          </span>
        </div>
        <SharedPlot label={t('plotLabel')} />
      </section>

      {rainDay ? (
        <RainDayBanner
          variant="water"
          title={t('rainTitle', { count: rainDay.words })}
          detail={t('rainDetail', {
            done: rainDay.done,
            members,
            mine: rainDay.mine,
            count: rainDay.words,
          })}
          waterHref={rainDay.href}
        />
      ) : null}

      <section className="flex flex-col gap-2 px-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[18px] font-semibold">{t('beds')}</h2>
          <span className="text-[12px] text-muted-foreground">{t('sorted')}</span>
        </div>
        {beds.map((bed) => (
          <Link
            key={bed.id}
            href={bed.href}
            className="flex items-center gap-2.5 rounded-[18px] border border-border bg-surface py-2 pl-2 pr-3 text-text transition-colors duration-quick ease-garden hover:border-muted-foreground"
          >
            <span className="flex h-11 w-11 shrink-0 items-end justify-center overflow-hidden rounded-[13px] bg-forest">
              <TilePlant plant={bed.plant} size="bed" />
            </span>
            <span className="flex min-w-0 flex-grow flex-col gap-1">
              <span className="flex justify-between gap-2">
                <span className="text-[15px] font-bold">{bed.title}</span>
                {bed.due === null ? null : bed.due > 0 ? (
                  <span className="rounded-[10px] bg-water-soft px-2 py-[3px] text-[12px] font-bold text-water-text">
                    {c('dueForYou', { count: bed.due })}
                  </span>
                ) : (
                  <span className="text-[12px] font-semibold text-success">{c('allWatered')}</span>
                )}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {[t('bedWords', { count: bed.words }), bed.level].filter(Boolean).join(t('separator'))}
              </span>
              <span aria-hidden="true" className="flex h-[5px] overflow-hidden rounded-[3px] bg-track">
                {bed.shares ? (
                  <>
                    <span className="bg-success" style={{ width: `${bed.shares.tree}%` }} />
                    <span className="bg-stage-flower" style={{ width: `${bed.shares.flower}%` }} />
                    <span className="bg-stage-sprout" style={{ width: `${bed.shares.sprout}%` }} />
                  </>
                ) : null}
              </span>
            </span>
          </Link>
        ))}
        {beds.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-muted-foreground">{t('noBeds')}</p>
        ) : null}
      </section>

      <section className="mx-4 flex items-center gap-2.5" aria-label={t('gardeners')}>
        <h2 className="flex-grow font-display text-[18px] font-semibold">{t('gardeners')}</h2>
        <span className="sr-only">{t('gardenersLabel', { count: members })}</span>
        <AvatarStack avatars={avatars} size={30} />
        {invite ? (
          invite.onClick || !invite.href ? (
            <button type="button" onClick={invite.onClick} className={gcn(inviteClasses, 'box-border h-[42px]')}>
              <PlusIcon width={16} height={16} />
              {t('invite')}
            </button>
          ) : (
            <Link href={invite.href} className={inviteClasses}>
              <PlusIcon width={16} height={16} />
              {t('invite')}
            </Link>
          )
        ) : null}
      </section>

      <GardenTabBar active="groups" groups sticky={stickyNav} sidebar={sidebar} />
      {children}
    </div>
  );
}
