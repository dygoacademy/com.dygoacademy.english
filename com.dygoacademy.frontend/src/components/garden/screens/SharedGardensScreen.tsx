'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '../cn';
import { GroupCard, type GroupCardProps } from '../GroupCard';
import { LinkIcon } from '../groupArt';
import { PlusIcon } from '../icons';
import { RainDayBanner } from '../RainDayBanner';
import { GardenTabBar, SCREEN_CLASSES } from './GardenTabBar';

/**
 * GR1 · Shared gardens (canvas `reference/GR1-shared-gardens`). Props only.
 *
 * Header (how many gardens and gardeners, a "+" to start one) → today's
 * rain day, if a garden called one → one card per garden → "Start a
 * garden" and "Join with a link" → the five-tab bar.
 *
 * "Start" and "Join" take an `onClick` (live: open the sheets) or an
 * `href` (reference pages). `children` is drawn last, for the sheets.
 */
export interface SharedGardensScreenProps {
  gardens: ReadonlyArray<GroupCardProps & { id: string }>;
  /** Distinct gardeners across all the gardens (header). */
  gardeners: number;
  rainDay: { group: string; words: number; done: number; members: number; ends: string; href: string } | null;
  start: { href?: string; onClick?: () => void };
  join: { href?: string; onClick?: () => void };
  stickyNav?: boolean;
  children?: React.ReactNode;
}

function Action({
  action,
  className,
  children,
  'aria-label': ariaLabel,
}: {
  action: { href?: string; onClick?: () => void };
  className: string;
  children: React.ReactNode;
  'aria-label'?: string;
}) {
  if (action.onClick || !action.href) {
    return (
      <button type="button" onClick={action.onClick} aria-label={ariaLabel} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link href={action.href} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );
}

const SECONDARY =
  'flex h-[54px] items-center justify-center gap-1.5 rounded-control text-[14px] font-bold text-garden-forest';

export function SharedGardensScreen({
  gardens,
  gardeners,
  rainDay,
  start,
  join,
  stickyNav = true,
  children,
}: SharedGardensScreenProps) {
  const t = useTranslations('screens.groups.list');

  return (
    <div className={gcn(SCREEN_CLASSES, 'relative gap-[14px] pt-[22px]')}>
      <header className="flex items-end gap-3 px-5">
        <div className="flex flex-grow flex-col">
          <span className="text-[13px] font-medium text-garden-muted">
            {t('summary', { gardens: gardens.length, gardeners })}
          </span>
          <h1 className="font-display text-[28px] font-semibold leading-[1.1]">{t('title')}</h1>
        </div>
        <Action
          action={start}
          aria-label={t('create')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-garden-forest text-white"
        >
          <PlusIcon width={20} height={20} />
        </Action>
      </header>

      {rainDay ? (
        <RainDayBanner
          variant="forest"
          title={t('rainTitle', { group: rainDay.group, count: rainDay.words })}
          detail={t('rainDetail', { done: rainDay.done, members: rainDay.members, time: rainDay.ends })}
          waterHref={rainDay.href}
        />
      ) : null}

      <div className="flex flex-col gap-2 px-4">
        {gardens.map(({ id, ...card }) => (
          <GroupCard key={id} {...card} />
        ))}
        {gardens.length === 0 ? (
          <div className="flex flex-col gap-1 rounded-[20px] border border-garden-border bg-garden-surface px-4 py-5 text-center">
            <span className="text-[16px] font-bold">{t('emptyTitle')}</span>
            <span className="text-[13px] text-garden-muted">{t('emptyBody')}</span>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Action action={start} className={gcn(SECONDARY, 'border border-dashed border-garden-dashed')}>
            <PlusIcon width={18} height={18} />
            {t('start')}
          </Action>
          <Action
            action={join}
            className={gcn(SECONDARY, 'border border-garden-border bg-garden-surface')}
          >
            <LinkIcon width={18} height={18} />
            {t('join')}
          </Action>
        </div>
      </div>

      <GardenTabBar active="groups" groups sticky={stickyNav} />
      {children}
    </div>
  );
}
