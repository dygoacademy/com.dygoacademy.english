'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { GroupRole } from '@/types';

import { gcn } from '../cn';
import { GardenerAvatar, type GardenerTone } from '../GardenerAvatar';
import { JoinCheckIcon, TileFlower, TileSprout, TileTree } from '../groupArt';
import { CloseIcon } from '../icons';
import { IconButton } from '../IconButton';
import { SCREEN_CLASSES } from './GardenTabBar';

/**
 * GR6 · Join a garden (canvas `reference/GR6-join`). Props only.
 *
 * Close → a small garden → who invited you and to which garden → the
 * garden's size (gardeners, shared beds, words: counts only) → what
 * joining means (the beds are planted in your garden, rain days, your
 * progress stays private) → the role you'll get → Join / Not now.
 *
 * No tab bar: this is a decision screen. The preview never shows who is
 * in the garden (invite preview endpoint, UI-G).
 */
export interface JoinGardenScreenProps {
  groupName: string;
  description: string | null;
  /** The inviter's display name; null writes "You're invited to". */
  inviter: { name: string; initial: string; tone: GardenerTone } | null;
  counts: { gardeners: number; beds: number; words: number };
  role: GroupRole;
  closeHref: string;
  /** `onClick` (live: redeem) wins over `href` (reference). */
  join: { href?: string; onClick?: () => void; busy?: boolean };
  notNowHref: string;
  /** An error or "already in" line above the button (live). */
  message?: React.ReactNode;
}

const JOIN_BUTTON =
  'mt-auto flex h-[58px] shrink-0 items-center justify-center rounded-[18px] bg-garden-primary text-[17px] font-bold text-white shadow-press-primary transition-transform duration-press ease-garden active:translate-y-[2px] disabled:opacity-60';

export function JoinGardenScreen({
  groupName,
  description,
  inviter,
  counts,
  role,
  closeHref,
  join,
  notNowHref,
  message,
}: JoinGardenScreenProps) {
  const t = useTranslations('screens.groups.join');
  const c = useTranslations('components.groups');
  const sheet = useTranslations('components.sheet');

  const stats = [
    { value: counts.gardeners, label: t('gardeners', { count: counts.gardeners }) },
    { value: counts.beds, label: t('beds', { count: counts.beds }) },
    { value: counts.words, label: t('words', { count: counts.words }) },
  ];

  return (
    <div className={gcn(SCREEN_CLASSES, 'gap-4 px-4 pb-7 pt-[22px]')}>
      <div className="flex justify-end">
        <IconButton asChild aria-label={sheet('close')}>
          <Link href={closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <div
          aria-hidden="true"
          className="box-border flex h-[150px] w-[180px] items-end justify-center gap-1 overflow-hidden rounded-[28px] bg-garden-forest pb-[14px]"
        >
          <TileSprout width={40} height={40} />
          <TileTree width={46} height={50} />
          <TileFlower width={40} height={50} />
        </div>
        <span className="mt-2 flex items-center gap-2">
          {inviter ? <GardenerAvatar text={inviter.initial} tone={inviter.tone} size={28} /> : null}
          <span className="text-[14px] text-garden-muted">
            {inviter ? t('invitedBy', { name: inviter.name }) : t('invited')}
          </span>
        </span>
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">{groupName}</h1>
        {description ? <span className="text-[14px] text-garden-muted">{description}</span> : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-0.5 rounded-control border border-garden-border bg-garden-surface p-3"
          >
            <span className="font-display text-[22px] font-semibold">{stat.value}</span>
            <span className="text-[12px] text-garden-muted">{stat.label}</span>
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-2.5 rounded-[20px] border border-garden-border bg-garden-surface px-4 py-[14px]">
        {[t('benefitBeds'), t('benefitRain'), t('benefitPrivate')].map((line) => (
          <li key={line} className="flex gap-2.5 text-[14px]">
            <JoinCheckIcon width={18} height={18} className="shrink-0" />
            {line}
          </li>
        ))}
      </ul>

      <span className="text-center text-[13px] text-garden-muted">
        {t.rich(`joinAs.${role}`, {
          role: c(`roles.${role}`),
          b: (chunks) => <b className="text-garden-text">{chunks}</b>,
        })}
      </span>

      {message ? (
        <div role="status" className="text-center text-[13px] text-garden-primary-text">
          {message}
        </div>
      ) : null}

      {join.onClick || !join.href ? (
        <button type="button" onClick={join.onClick} disabled={join.busy} className={JOIN_BUTTON}>
          {join.busy ? t('joining') : t('join')}
        </button>
      ) : (
        <Link href={join.href} className={JOIN_BUTTON}>
          {t('join')}
        </Link>
      )}
      <Link href={notNowHref} className="text-center text-[15px] font-semibold text-garden-forest underline">
        {t('notNow')}
      </Link>
    </div>
  );
}
