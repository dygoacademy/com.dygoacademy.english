import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from '../cn';
import { useGardenFormat, type ClockTime } from '../format';
import { HeroGardenCard, type HeroPlant } from '../HeroGardenCard';
import { GoldenBloomIcon, MicIcon } from '../icons';
import { BasketIcon, MoreList, SeedIcon, type MoreRow } from '../MoreList';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';
import { HomeHeader, type Greeting } from './TodaysGardenScreen';

/**
 * A1b · All watered (canvas `reference/A1b-all-watered`), Today's Garden
 * when nothing is due and today's missions are all done. Props only.
 *
 * Header (A1's, with the streak pill the board leaves out) → the resting
 * garden ("All watered today", sun and butterfly, no drops) → the Golden
 * Bloom card with the next ripening → "Want a little more?" (plant 5 new
 * words from a bed, say 3 sentences, quiz a bed) → tab bar. iPad keeps
 * the one column, centred, like A5.
 */
export interface AllWateredScreenProps {
  /** Today, as a calendar day (format.ts). */
  date: Date;
  greeting: Greeting;
  /** Null greets without a name. */
  name: string | null;
  /** Current streak in days; null hides the pill. */
  streakDays: number | null;
  plants: readonly HeroPlant[];
  /** Today's missions; null (the missions call failed) leaves the Golden Bloom line out. */
  bloom: { done: number; total: number } | null;
  /** "Next ripening: tomorrow 7:30 · 14 words"; `time` null without a reminder; null hides the line. */
  ripens: { time: ClockTime | null; count: number } | null;
  extras: {
    /** The bed with the most seeds; null hides the row. */
    plant: { bed: string; href: string } | null;
    /** S6: the active bed is fully planted; its harvest row takes the plant row's place. */
    harvest?: { bed: string; href: string } | null;
    speakHref: string;
    quizHref: string;
  };
  stickyNav?: boolean;
}

export function AllWateredScreen({
  date,
  greeting,
  name,
  streakDays,
  plants,
  bloom,
  ripens,
  extras,
  stickyNav = true,
}: AllWateredScreenProps) {
  const t = useTranslations('screens.allWatered');
  const home = useTranslations('screens.home');
  const f = useGardenFormat();

  const rows: MoreRow[] = [
    ...(extras.harvest
      ? [
          {
            key: 'harvest',
            href: extras.harvest.href,
            icon: <BasketIcon />,
            title: t('harvest'),
            meta: t('harvestFrom', { bed: extras.harvest.bed }),
            tone: 'primary' as const,
          },
        ]
      : extras.plant
      ? [
          {
            key: 'plant',
            href: extras.plant.href,
            icon: <SeedIcon />,
            title: t('plant'),
            meta: t('plantFrom', { bed: extras.plant.bed }),
          },
        ]
      : []),
    {
      key: 'speak',
      href: extras.speakHref,
      icon: <MicIcon width={19} height={19} strokeWidth="2.1" />,
      title: t('speak'),
      meta: t('speakTime'),
    },
    {
      key: 'quiz',
      href: extras.quizHref,
      icon: <QuestionIcon />,
      title: t('quiz'),
      meta: t('quizMeta'),
    },
  ];

  return (
    <div
      className={gcn(SCREEN_CLASSES, IPAD_NAV_COLUMN, 'gap-[14px] pt-[22px] ipad:max-w-[720px] ipad-lg:max-w-[880px]')}
    >
      <HomeHeader date={date} greeting={greeting} name={name} streakDays={streakDays} />

      <HeroGardenCard
        className="mx-5"
        variant="resting"
        overline={home('heroOverline')}
        title={t('title')}
        subtitle={t('resting')}
        plants={plants}
        legend={[]}
      />

      {bloom || ripens ? (
        <section className="mx-5 flex items-center gap-3 rounded-[22px] border border-border bg-surface px-4 py-[14px]">
          <span
            aria-hidden="true"
            className="bloom flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-soft"
          >
            <GoldenBloomIcon width={34} height={34} stemTo={23} />
          </span>
          <span className="flex flex-grow flex-col">
            {bloom ? (
              <span className="text-[15px] font-bold">{t('bloom', { done: bloom.done, total: bloom.total })}</span>
            ) : null}
            {ripens ? (
              <span className={gcn('text-[13px]', bloom ? 'text-muted-foreground' : 'font-bold')}>
                {ripens.time
                  ? t('nextRipening', {
                      time: f.clock(ripens.time),
                      count: ripens.count,
                    })
                  : t('nextRipeningNoTime', { count: ripens.count })}
              </span>
            ) : null}
          </span>
        </section>
      ) : null}

      <MoreList className="mx-5" rows={rows} />

      <GardenTabBar active="garden" sticky={stickyNav} />
    </div>
  );
}

/** A1b "Quiz a bed": a question mark in a circle (canvas 19px, stroke 2.1). */
function QuestionIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5 A2.5 2.5 0 1 1 12 12 V13.5" />
      <path d="M12 17 V17.2" />
    </svg>
  );
}
