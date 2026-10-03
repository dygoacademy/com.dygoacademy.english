import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ButtonTwoLine, buttonClassName } from '../buttonStyles';
import { gcn } from '../cn';
import { useGardenFormat } from '../format';
import { HeroGardenCard, type HeroLegendItem, type HeroPlant } from '../HeroGardenCard';
import { ArrowRightIcon, RainBarrelIcon } from '../icons';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A5 · Welcome back (canvas `reference/A5-welcome-back`), shown on the
 * Garden tab after 2+ missed days. Props only.
 *
 * Header → the faded garden with the rain cloud → "streak is safe" (only
 * when streak freezes exist, UI-6) → "Start small": revive the wilting
 * words first, or water everything → tab bar.
 */
export interface WelcomeBackScreenProps {
  /** Today, as a calendar day (format.ts). */
  date: Date;
  /** Null welcomes without a name. */
  name: string | null;
  garden: { thirsty: number; wilting: number; ripe: number | null; plants: readonly HeroPlant[] };
  /** Null until streak freezes exist (UI-6). */
  /** `refills`: the calendar day the rain barrel refills. */
  streak: { days: number; covered: number; left: number; refills: Date } | null;
  /** `minutes` is an estimate; null leaves it out. */
  revive: { count: number; minutes: number | null; href: string } | null;
  waterAll: { count: number; href: string } | null;
  stickyNav?: boolean;
}

export function WelcomeBackScreen({
  date,
  name,
  garden,
  streak,
  revive,
  waterAll,
  stickyNav = true,
}: WelcomeBackScreenProps) {
  const t = useTranslations('screens.comeback');
  const f = useGardenFormat();

  const legend: HeroLegendItem[] = [
    { stage: 'thirsty', label: t('legend.thirsty', { count: garden.thirsty }) },
    { stage: 'wilting', label: t('legend.wilting', { count: garden.wilting }) },
    ...(garden.ripe !== null
      ? [{ stage: 'tree' as const, label: t('legend.ripe', { count: garden.ripe }) }]
      : []),
  ];

  return (
    // Design system §10, A5: iPad keeps the one column, centred, max 640.
    <div
      className={gcn(
        SCREEN_CLASSES,
        IPAD_NAV_COLUMN,
        'gap-4 pt-[22px] ipad:max-w-[720px] ipad-lg:max-w-[880px]',
      )}
    >
      <header className="flex flex-col gap-1 px-5">
        <span className="text-[13px] font-medium text-muted-foreground">{f.longDay(date)}</span>
        <h1 className="font-display text-[30px] font-semibold leading-[1.12]">
          {name
            ? t.rich('title', { name, br: () => <br /> })
            : t.rich('titleNoName', { br: () => <br /> })}
        </h1>
      </header>

      <HeroGardenCard className="mx-4" variant="comeback" plants={garden.plants} legend={legend} />

      {streak ? (
        <div className="mx-4 flex items-center gap-3 rounded-[18px] border border-water-border bg-water-soft px-[14px] py-3">
          <RainBarrelIcon width={30} height={30} stroke="var(--color-water-strong)" />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-water-text">
              {t('streakSafe', { count: streak.days })}
            </span>
            <span className="text-[13px] text-water-text-soft">
              {t('streakBarrel', {
                covered: streak.covered,
                left: streak.left,
                day: f.weekday(streak.refills),
              })}
            </span>
          </div>
        </div>
      ) : null}

      {revive || waterAll ? (
        <section className="mx-4 flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-4">
          {revive ? (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="overline-label text-[12px] font-bold text-success">
                  {t('overline')}
                </span>
                <h2 className="font-display text-[21px] font-semibold">
                  {t('reviveTitle', { count: revive.count })}
                </h2>
                <p className="text-[14px] text-muted-foreground">{t('reviveBody')}</p>
              </div>
              <Link href={revive.href} className={buttonClassName('primary', { twoLine: true, className: 'md:max-w-none' })}>
                <ButtonTwoLine
                  label={t('revive')}
                  secondLine={
                    revive.minutes === null
                      ? t('reviveDetailNoTime', { count: revive.count })
                      : t('reviveDetail', { count: revive.count, minutes: revive.minutes })
                  }
                />
                <ArrowRightIcon width={24} height={24} stroke="var(--color-surface)" />
              </Link>
            </>
          ) : null}
          {waterAll ? (
            <Link
              href={waterAll.href}
              className="text-center text-[14px] font-semibold text-forest underline"
            >
              {t(revive ? 'waterAllInstead' : 'waterAll', { count: waterAll.count })}
            </Link>
          ) : null}
        </section>
      ) : null}

      <GardenTabBar active="garden" sticky={stickyNav} />
    </div>
  );
}
