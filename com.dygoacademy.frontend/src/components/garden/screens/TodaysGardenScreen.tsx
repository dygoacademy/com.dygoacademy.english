import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ButtonTwoLine, buttonClassName } from '../buttonStyles';
import { gcn } from '../cn';
import { HeroGardenCard, type HeroLegendItem, type HeroPlant } from '../HeroGardenCard';
import {
  ArrowRightIcon,
  BellIcon,
  ChallengeIcon,
  GoldenBloomIcon,
  MoonIcon,
  PlantIcon,
  WaterIcon,
} from '../icons';
import { MissionRow, type MissionStatus } from '../MissionRow';
import { StreakPill } from '../StreakPill';
import { GardenTabBar, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A1 · Today's Garden (canvas `reference/A1-todays-garden`). Props only.
 *
 * Header (date, greeting, streak pill) → hero garden card → today's
 * missions → the main action and the "ripens tomorrow" line → tab bar.
 * Anything the backend can't provide yet is `null` and shows an honest
 * empty / coming-soon state instead of numbers.
 */
export type Greeting = 'morning' | 'afternoon' | 'evening';

export type MissionItem =
  | { kind: 'water'; done: number; total: number }
  | { kind: 'plant'; done: number; total: number }
  | { kind: 'challenge'; minutes: number; done: boolean };

export interface TodaysGardenScreenProps {
  /** Already formatted, e.g. "Friday, 25 September". */
  dateLabel: string;
  greeting: Greeting;
  /** Null greets without a name. */
  name: string | null;
  /** Current streak in days; null hides the pill. */
  streakDays: number | null;
  garden: {
    growing: number;
    thirsty: number;
    ripe: number | null;
    wilting: number;
    plants: readonly HeroPlant[];
  };
  /** Null until daily missions exist (UI-6): shows "coming soon". */
  missions: readonly MissionItem[] | null;
  /** The main action; null when nothing is due. */
  /** `minutes` is an estimate; null leaves it out. */
  action: {
    href: string;
    kind: 'continue' | 'start';
    wordsLeft: number;
    minutes: number | null;
  } | null;
  /** "Tomorrow 7:30 AM · 14 words ripen"; null hides the line. */
  ripens: { time: string; count: number } | null;
  stickyNav?: boolean;
}

function missionStatus(item: MissionItem): MissionStatus {
  if (item.kind === 'challenge') return item.done ? 'done' : 'todo';
  if (item.done >= item.total) return 'done';
  return item.done > 0 ? 'inProgress' : 'todo';
}

export function TodaysGardenScreen({
  dateLabel,
  greeting,
  name,
  streakDays,
  garden,
  missions,
  action,
  ripens,
  stickyNav = true,
}: TodaysGardenScreenProps) {
  const t = useTranslations('screens.home');

  const legend: HeroLegendItem[] = [
    { stage: 'thirsty', label: t('legend.thirsty', { count: garden.thirsty }) },
    ...(garden.ripe !== null
      ? [{ stage: 'tree' as const, label: t('legend.ripe', { count: garden.ripe }) }]
      : []),
    { stage: 'wilting', label: t('legend.wilting', { count: garden.wilting }) },
  ];

  const doneCount = missions?.filter((m) => missionStatus(m) === 'done').length ?? 0;

  return (
    <div className={gcn(SCREEN_CLASSES, 'gap-[14px] pt-[22px]')}>
      <header className="flex items-end gap-3 px-5">
        <div className="flex flex-grow flex-col">
          <span className="text-[13px] font-medium text-garden-muted">{dateLabel}</span>
          <h1 className="font-display text-[28px] font-semibold leading-[1.1]">
            {name ? t(`greeting.${greeting}`, { name }) : t(`greetingNoName.${greeting}`)}
          </h1>
        </div>
        {streakDays !== null ? (
          <StreakPill
            count={String(streakDays)}
            unit={t('streakUnit', { count: streakDays })}
            label={t('streakLabel', { count: streakDays })}
          />
        ) : null}
      </header>

      <HeroGardenCard
        className="mx-4"
        overline={t('heroOverline')}
        title={t('heroTitle', { count: garden.growing })}
        trailing={greeting === 'evening' ? <MoonIcon width={30} height={30} /> : undefined}
        plants={garden.plants}
        legend={legend}
      />

      <section className="mx-4 flex flex-col gap-3 rounded-[22px] border border-garden-border bg-garden-surface px-4 py-[14px]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-semibold">{t('missions.title')}</h2>
          {missions ? (
            <span className="text-[13px] font-semibold text-garden-muted">
              {t('missions.progress', { done: doneCount, total: missions.length })}
            </span>
          ) : null}
        </div>
        {missions ? (
          <>
            <ul className="flex flex-col gap-3">
              {missions.map((item, index) => (
                <li key={index}>
                  <Mission item={item} />
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2 rounded-tile bg-garden-gold-soft px-2.5 py-2 text-[13px] text-garden-gold-soft-text">
              <GoldenBloomIcon width={18} height={18} centreFirst />
              <span>
                {t.rich('missions.goldenBloom', { total: missions.length, b: (c) => <b>{c}</b> })}
              </span>
            </p>
          </>
        ) : (
          <p className="text-[13px] text-garden-muted">{t('missions.comingSoon')}</p>
        )}
      </section>

      <div className="flex flex-col gap-2.5 px-4">
        {action ? (
          <Link href={action.href} className={buttonClassName('primary', { twoLine: true })}>
            <ButtonTwoLine
              label={t(`action.${action.kind}`)}
              secondLine={
                action.minutes === null
                  ? t('action.detailNoTime', { count: action.wordsLeft })
                  : t('action.detail', { count: action.wordsLeft, minutes: action.minutes })
              }
            />
            <ArrowRightIcon width={24} height={24} stroke="var(--color-surface)" />
          </Link>
        ) : null}
        {ripens ? (
          <p className="flex items-center gap-2 px-1 text-[13px] text-garden-muted">
            <BellIcon width={16} height={16} />
            <span>
              {t.rich('ripens', {
                time: ripens.time,
                count: ripens.count,
                b: (c) => <b className="text-garden-text">{c}</b>,
              })}
            </span>
          </p>
        ) : null}
      </div>

      <GardenTabBar active="garden" sticky={stickyNav} />
    </div>
  );
}

function Mission({ item }: { item: MissionItem }) {
  const t = useTranslations('screens.home.missions');
  const status = missionStatus(item);
  if (item.kind === 'challenge') {
    return (
      <MissionRow
        tone="gold"
        icon={<ChallengeIcon width={20} height={20} />}
        title={t('challenge')}
        value={item.done ? 1 : 0}
        max={1}
        valueLabel={item.done ? t('valueDone') : t('valueMinutes', { count: item.minutes })}
        progressText={item.done ? t('valueDone') : t('notStarted')}
        status={status}
      />
    );
  }
  const water = item.kind === 'water';
  return (
    <MissionRow
      tone={water ? 'water' : 'plant'}
      icon={
        water ? (
          <WaterIcon width={20} height={20} />
        ) : (
          <PlantIcon width={20} height={20} stroke="var(--color-forest)" />
        )
      }
      title={t(item.kind, { count: item.total })}
      value={item.done}
      max={item.total}
      valueLabel={
        status === 'done' ? t('valueDone') : t('valueCount', { done: item.done, total: item.total })
      }
      progressText={t(water ? 'progressWater' : 'progressPlant', {
        done: item.done,
        total: item.total,
      })}
      status={status}
    />
  );
}
