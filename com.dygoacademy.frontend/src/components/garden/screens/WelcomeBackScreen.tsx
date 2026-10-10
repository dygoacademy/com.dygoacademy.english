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
 * A5 · Welcome back (canvas `reference/A5-welcome-back`) and A5b, nothing
 * wilting (`reference/A5b-welcome-back-start`), shown on the Garden tab
 * after 2+ missed days when something is due or wilting. Props only.
 *
 * Header → the faded garden with the rain cloud → "streak is safe" (only
 * when streak freezes exist, UI-6) → "Start small": revive the wilting
 * words (A5), water the most overdue batch (A5b) or the few that are due
 * (A5b short), with "Water all N words instead" under the first two →
 * tab bar.
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
  /**
   * The "Start small" card: `revive` the wilting words (A5), a `batch` of
   * the most overdue words (A5b) or `all` of the few due words (A5b short).
   * `minutes` is an estimate; null leaves it out. Null hides the card.
   */
  start: {
    kind: 'revive' | 'batch' | 'all';
    count: number;
    minutes: number | null;
    href: string;
    waterAll: { count: number; href: string } | null;
  } | null;
  stickyNav?: boolean;
}

/** Message keys (`screens.comeback`) for each kind of "Start small" card. */
const START_COPY = {
  revive: { title: 'reviveTitle', body: 'reviveBody', button: 'revive' },
  batch: { title: 'batchTitle', body: 'batchBody', button: 'batch' },
  all: { title: 'allTitle', body: 'allBody', button: 'startWatering' },
} as const;

export function WelcomeBackScreen({
  date,
  name,
  garden,
  streak,
  start,
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

      {start ? (
        <section className="mx-4 flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-4">
          <div className="flex flex-col gap-0.5">
            <span className="overline-label text-[12px] font-bold text-success">{t('overline')}</span>
            <h2 className="font-display text-[21px] font-semibold">
              {t(START_COPY[start.kind].title, { count: start.count })}
            </h2>
            <p className="text-[14px] text-muted-foreground">{t(START_COPY[start.kind].body)}</p>
          </div>
          <Link href={start.href} className={buttonClassName('primary', { twoLine: true, className: 'md:max-w-none' })}>
            <ButtonTwoLine
              label={t(START_COPY[start.kind].button)}
              secondLine={
                start.minutes === null
                  ? t('reviveDetailNoTime', { count: start.count })
                  : t('reviveDetail', { count: start.count, minutes: start.minutes })
              }
            />
            <ArrowRightIcon width={24} height={24} stroke="var(--color-surface)" />
          </Link>
          {start.waterAll ? (
            <Link
              href={start.waterAll.href}
              className="text-center text-[14px] font-semibold text-forest underline"
            >
              {t('waterAllInstead', { count: start.waterAll.count })}
            </Link>
          ) : null}
        </section>
      ) : null}

      <GardenTabBar active="garden" sticky={stickyNav} />
    </div>
  );
}
