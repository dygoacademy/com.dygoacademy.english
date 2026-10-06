'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '../cn';
import { GardenerRow, type GardenerRowProps } from '../GardenerRow';
import { LinkIcon, RainCloud } from '../groupArt';
import { BackIcon, MicIcon } from '../icons';
import { IconButton } from '../IconButton';
import { TrickyPatchRow } from '../TrickyPatchRow';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';

/**
 * GR3 / GR4 · Tend the garden (canvas `reference/GR3-tricky-patches`,
 * `reference/GR4-gardeners`), admins only. Props only.
 *
 * Header (back, "Tend the garden", the garden's name) → two tabs:
 * - **Tricky patches** (GR3): the words the garden missed most in the last
 *   7 days, as totals (never one person's answers), then "Call a rain
 *   day": words per gardener (5 / 10 / 20) and the push. Phase 13 SE6
 *   (`reference/SE6-entry-echo`): with an Echo challenge the list stops
 *   at 2 rows and the Echo card (the trickiest word to say, "3 of 5
 *   gardeners done": totals only, D-4) sits before the rain day.
 * - **Gardeners** (GR4): the roster with a role picker per gardener, what
 *   each role can do, and the live invite links with Invite.
 *
 * The tabs are links (`trickyHref`, `gardenersHref`), so each tab has its
 * own URL and the back button works. `children` is drawn last (sheets).
 */
export const RAIN_DAY_SIZES = [5, 10, 20] as const;
/** SE6: tricky patches shown above the Echo challenge. */
export const ECHO_TRICKY_ROWS = 2;
export type RainDaySize = (typeof RAIN_DAY_SIZES)[number];

export interface TendGardenScreenProps {
  tab: 'tricky' | 'gardeners';
  groupName: string;
  backHref: string;
  trickyHref: string;
  gardenersHref: string;
  tricky?: {
    rows: ReadonlyArray<{ word: string; misses: number; gardeners: number }>;
    rainDay: {
      members: number;
      size: RainDaySize;
      onSize?: (size: RainDaySize) => void;
      onStart?: () => void;
      busy?: boolean;
      /**
       * The last rain day, if known: its weekday and how many joined, out
       * of `members` (default: `rainDay.members`).
       */
      last: { day: string; joined: number; members?: number } | null;
      status?: string | null;
    };
    /** Shown instead of the rows while loading or on error. */
    message?: string | null;
    /** SE6: the trickiest word to say; null / omitted hides the card. */
    echo?: {
      word: string;
      ipa: string | null;
      done: number;
      members: number;
      /** The speaking flow for the word. */
      href: string;
    } | null;
  };
  gardeners?: {
    rows: ReadonlyArray<GardenerRowProps & { id: string }>;
    invites: { count: number; detail: string | null };
    /** The invite links card (live: opens the links sheet). */
    onInvites?: () => void;
    invite: { href?: string; onClick?: () => void };
    /** Extra blocks under the invite card (live: settings, messages). */
    footer?: React.ReactNode;
  };
  stickyNav?: boolean;
  children?: React.ReactNode;
}

const WATER_BUTTON =
  'flex h-10 shrink-0 items-center rounded-[14px] bg-primary px-[14px] text-[14px] font-bold text-white shadow-[0_3px_0_var(--color-primary-shadow)] active:translate-y-px';

export function TendGardenScreen({
  tab,
  groupName,
  backHref,
  trickyHref,
  gardenersHref,
  tricky,
  gardeners,
  stickyNav = true,
  children,
}: TendGardenScreenProps) {
  const t = useTranslations('screens.groups.tend');

  const tabs = [
    { key: 'tricky', href: trickyHref, label: t('trickyTab') },
    { key: 'gardeners', href: gardenersHref, label: t('gardenersTab') },
  ] as const;

  const topMisses = Math.max(1, ...(tricky?.rows ?? []).map((row) => row.misses));

  return (
    <div className={gcn(SCREEN_CLASSES, IPAD_NAV_COLUMN, 'relative gap-[14px] pt-[22px]')}>
      <header className="flex items-center gap-3 px-4">
        <IconButton asChild aria-label={t('back')} className="box-content">
          <Link href={backHref}>
            <BackIcon width={20} height={20} />
          </Link>
        </IconButton>
        <div className="flex flex-grow flex-col">
          <h1 className="font-display text-[24px] font-semibold leading-[1.1]">{t('title')}</h1>
          <span className="text-[13px] text-muted-foreground">{groupName}</span>
        </div>
      </header>

      <div
        role="tablist"
        aria-label={t('title')}
        className="mx-4 grid grid-cols-2 gap-1 rounded-[14px] bg-track p-1"
      >
        {tabs.map((item) => {
          const selected = item.key === tab;
          return (
            <Link
              key={item.key}
              href={item.href}
              role="tab"
              aria-selected={selected}
              replace
              scroll={false}
              className={gcn(
                'flex h-9 items-center justify-center rounded-[11px] text-[14px] font-bold',
                selected ? 'bg-surface text-forest' : 'bg-transparent text-muted-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {tab === 'tricky' && tricky ? (
        <>
          <section
            role="tabpanel"
            aria-label={t('trickyTab')}
            className="mx-4 flex flex-col rounded-[22px] border border-border bg-surface px-4 pb-2 pt-[14px]"
          >
            <div className="mb-0.5 flex items-baseline justify-between">
              <h2 className="font-display text-[18px] font-semibold">{t('trickyTitle')}</h2>
              <span className="text-[12px] text-muted-foreground">{t('window')}</span>
            </div>
            <span className="mb-1 text-[13px] text-muted-foreground">{t('trickyIntro')}</span>
            {tricky.message ? (
              <p className="py-3 text-[13px] text-muted-foreground">{tricky.message}</p>
            ) : tricky.rows.length === 0 ? (
              <p className="py-3 text-[13px] text-muted-foreground">{t('trickyEmpty')}</p>
            ) : (
              <ul className="flex flex-col">
                {(tricky.echo ? tricky.rows.slice(0, ECHO_TRICKY_ROWS) : tricky.rows).map((row) => (
                  <TrickyPatchRow
                    key={row.word}
                    word={row.word}
                    meta={t('trickyMeta', { misses: row.misses, gardeners: row.gardeners })}
                    share={(row.misses / topMisses) * 100}
                  />
                ))}
              </ul>
            )}
          </section>

          {tricky.echo ? (
            <section
              aria-labelledby="echo-title"
              className="mx-4 flex flex-col gap-2.5 rounded-[22px] border border-primary-border bg-primary-soft px-4 py-[14px]"
            >
              <div className="flex items-baseline justify-between">
                <h2 id="echo-title" className="font-display text-[18px] font-semibold">
                  {t('echoTitle')}
                </h2>
                <span className="text-[12px] text-muted-foreground">{t('echoWindow')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-surface"
                >
                  <MicIcon width={24} height={24} />
                </span>
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold text-primary-text">
                    {t('echoKicker')}
                  </span>
                  <span
                    lang="en"
                    className="font-display text-[24px] font-semibold leading-[1.15]"
                  >
                    {tricky.echo.word}
                  </span>
                  {tricky.echo.ipa ? (
                    <span lang="en" className="text-[13px] text-muted-foreground">
                      {tricky.echo.ipa}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-[5px]">
                <span className="text-[14px] font-bold">
                  {t('echoDone', { done: tricky.echo.done, total: tricky.echo.members })}
                </span>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={Math.max(1, tricky.echo.members)}
                  aria-valuenow={tricky.echo.done}
                  aria-valuetext={t('echoDone', {
                    done: tricky.echo.done,
                    total: tricky.echo.members,
                  })}
                  className="h-1.5 rounded-[3px] bg-primary-border"
                >
                  {tricky.echo.done > 0 ? (
                    <div
                      className="h-1.5 rounded-[3px] bg-primary"
                      style={{
                        width: `${Math.round((Math.min(tricky.echo.done, tricky.echo.members) / Math.max(1, tricky.echo.members)) * 100)}%`,
                      }}
                    />
                  ) : null}
                </div>
                <span className="text-[12px] text-muted-foreground">{t('echoNote')}</span>
              </div>
              <Link
                href={tricky.echo.href}
                className="flex h-[52px] items-center justify-center gap-2 rounded-control bg-primary text-[16px] font-bold text-white shadow-press-primary transition-transform duration-press ease-garden active:translate-y-[2px]"
              >
                <MicIcon width={20} height={20} />
                {t('echoSay')}
              </Link>
            </section>
          ) : null}

          <section className="mx-4 flex flex-col gap-3 rounded-[22px] bg-forest p-4 text-on-forest">
            <div className="flex items-center gap-2.5">
              <RainCloud width={40} height={30} />
              <div className="flex flex-col">
                <h2 className="text-[16px] font-bold">{t('rainTitle')}</h2>
                <span className="text-[12px] text-on-forest-muted">
                  {t('rainBody', { count: tricky.rainDay.members })}
                </span>
              </div>
            </div>
            <div role="group" aria-label={t('sizeLabel')} className="grid grid-cols-3 gap-2">
              {RAIN_DAY_SIZES.map((size) => {
                const pressed = size === tricky.rainDay.size;
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => tricky.rainDay.onSize?.(size)}
                    className={gcn(
                      'h-10 rounded-[13px] border text-[14px] font-bold',
                      pressed
                        ? 'border-on-forest bg-on-forest text-forest'
                        : 'border-on-forest-line bg-transparent text-on-forest',
                    )}
                  >
                    {t('size', { count: size })}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={tricky.rainDay.onStart}
              disabled={tricky.rainDay.busy}
              className="h-[52px] rounded-control bg-primary text-[16px] font-bold text-white shadow-press-primary transition-transform duration-press ease-garden active:translate-y-[2px] disabled:opacity-60"
            >
              {t('start', { count: tricky.rainDay.size })}
            </button>
            {tricky.rainDay.status ? (
              <span role="status" className="text-[12px] text-stage-sprout">
                {tricky.rainDay.status}
              </span>
            ) : tricky.rainDay.last ? (
              <span className="text-[12px] text-stage-sprout">
                {t('last', {
                  day: tricky.rainDay.last.day,
                  joined: tricky.rainDay.last.joined,
                  members: tricky.rainDay.last.members ?? tricky.rainDay.members,
                })}
              </span>
            ) : null}
          </section>
        </>
      ) : null}

      {tab === 'gardeners' && gardeners ? (
        <>
          <ul
            role="tabpanel"
            aria-label={t('gardenersTab')}
            className="mx-4 flex flex-col overflow-hidden rounded-[22px] border border-border bg-surface"
          >
            {gardeners.rows.map(({ id, ...row }, index) => (
              <GardenerRow key={id} {...row} last={index === gardeners.rows.length - 1} />
            ))}
          </ul>
          <div className="mx-4 flex flex-col gap-1.5 px-1 text-[12px] text-muted-foreground">
            <span>
              {t.rich('legend', {
                b: (chunks) => <b className="text-text">{chunks}</b>,
              })}
            </span>
          </div>
          <div className="mx-4 flex items-center gap-3 rounded-[18px] border border-border bg-surface px-[14px] py-3">
            {gardeners.onInvites ? (
              <button
                type="button"
                onClick={gardeners.onInvites}
                className="flex min-w-0 flex-grow items-center gap-3 text-left"
              >
                <InviteSummary invites={gardeners.invites} />
              </button>
            ) : (
              <InviteSummary invites={gardeners.invites} />
            )}
            {gardeners.invite.onClick || !gardeners.invite.href ? (
              <button type="button" onClick={gardeners.invite.onClick} className={WATER_BUTTON}>
                {t('invite')}
              </button>
            ) : (
              <Link href={gardeners.invite.href} className={WATER_BUTTON}>
                {t('invite')}
              </Link>
            )}
          </div>
          {gardeners.footer}
        </>
      ) : null}

      <GardenTabBar active="groups" groups sticky={stickyNav} />
      {children}
    </div>
  );
}

function InviteSummary({ invites }: { invites: { count: number; detail: string | null } }) {
  const t = useTranslations('screens.groups.tend');
  return (
    <>
      <LinkIcon width={22} height={22} className="shrink-0 text-forest" />
      <span className="flex flex-grow flex-col">
        <span className="text-[14px] font-bold">
          {invites.count > 0 ? t('invitesActive', { count: invites.count }) : t('invitesNone')}
        </span>
        <span className="text-[12px] text-muted-foreground">
          {invites.count > 0 ? invites.detail : t('invitesNoneBody')}
        </span>
      </span>
    </>
  );
}
