import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '../cn';
import { useGardenFormat, type ClockTime } from '../format';
import { HeroGardenCard, type HeroLegendItem, type HeroPlant } from '../HeroGardenCard';
import {
  ArrowRightIcon,
  BellIcon,
  ChallengeIcon,
  CheckIcon,
  GoldenBloomIcon,
  MicIcon,
  MoonIcon,
  PlantIcon,
  WaterIcon,
} from '../icons';
import type { MissionStatus } from '../MissionRow';
import { StreakPill } from '../StreakPill';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A1 · Today's Garden (canvas `reference/A1-todays-garden`). Props only.
 *
 * Header (date, greeting, streak pill) → hero garden card → today's
 * missions → the "ripens tomorrow" line → tab bar. The missions card
 * (Option D, 2026-10-10) opens with **Next up**: the first mission that
 * isn't done, in a light blue panel with its own Start button. **Then**
 * lists the others as compact rows: open ones link to their activity,
 * done ones are plain and struck through. With everything done there is
 * no Next up panel. Anything the backend can't provide yet is `null` and
 * shows an honest empty / coming-soon state instead of numbers.
 */
export type Greeting = 'morning' | 'afternoon' | 'evening';

/** Every kind: `href` makes the row a link to its activity while it isn't done. */
export type MissionItem =
  /** total = watered today + still due (the hero's "thirsty" count). */
  | { kind: 'water'; done: number; total: number; href?: string }
  /** Missions v0 (U4-4): "Water today's thirsty words", done = reviewed today. */
  | { kind: 'thirsty'; done: number; total: number; href?: string }
  | { kind: 'plant'; done: number; total: number; href?: string }
  /** `minutes` null: no time estimate (live data). */
  | { kind: 'challenge'; minutes: number | null; done: boolean; href?: string }
  /**
   * Phase 13 SE1 (`reference/SE1-entry-home`): "Say 3 ripe words", on a
   * light clay row linking to The Pond while not done. `minutes` shows
   * before any word is said (null: the count instead).
   */
  | { kind: 'speak'; done: number; total: number; minutes: number | null; href?: string };

export interface TodaysGardenScreenProps {
  /** Today, as a calendar day (format.ts `calendarDay` / `todayIn`). */
  date: Date;
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
  /** All missions done today (UI-6): the Golden Bloom strip says it has bloomed. */
  goldenBloom?: boolean;
  /** "Tomorrow 7:30 AM · 14 words ripen"; null hides the line. */
  ripens: { time: ClockTime; count: number } | null;
  stickyNav?: boolean;
}

function missionStatus(item: MissionItem): MissionStatus {
  if (item.kind === 'challenge') return item.done ? 'done' : 'todo';
  if (item.done >= item.total) return 'done';
  return item.done > 0 ? 'inProgress' : 'todo';
}

export function TodaysGardenScreen({
  date,
  greeting,
  name,
  streakDays,
  garden,
  missions,
  goldenBloom = false,
  ripens,
  stickyNav = true,
}: TodaysGardenScreenProps) {
  const t = useTranslations('screens.home');
  const f = useGardenFormat();

  const legend: HeroLegendItem[] = [
    { stage: 'thirsty', label: t('legend.thirsty', { count: garden.thirsty }) },
    ...(garden.ripe !== null
      ? [{ stage: 'tree' as const, label: t('legend.ripe', { count: garden.ripe }) }]
      : []),
    { stage: 'wilting', label: t('legend.wilting', { count: garden.wilting }) },
  ];

  const doneCount = missions?.filter((m) => missionStatus(m) === 'done').length ?? 0;

  return (
    <div className={gcn(SCREEN_CLASSES, IPAD_NAV_COLUMN, 'gap-[14px] pt-[22px]')}>
      <HomeHeader date={date} greeting={greeting} name={name} streakDays={streakDays} />

      {/*
        Design system §10, A1: iPhone stacks hero → missions → ripens line
        (`contents`). iPad portrait: hero 5/8 + missions 3/8. Landscape:
        hero full width, then missions 6/12 + the ripens line 6/12.
      */}
      <div className="contents ipad:mx-4 ipad:grid ipad:grid-cols-8 ipad:items-start ipad:gap-4 ipad-lg:grid-cols-12">
        <HeroGardenCard
          className="mx-4 ipad:col-span-5 ipad:mx-0 ipad-lg:col-span-12"
          overline={t('heroOverline')}
          title={t('heroTitle', { count: garden.growing })}
          trailing={greeting === 'evening' ? <MoonIcon width={30} height={30} /> : undefined}
          plants={garden.plants}
          legend={legend}
        />

        <div className="contents ipad:col-span-3 ipad:flex ipad:flex-col ipad:gap-[14px] ipad-lg:contents">
          <section className="mx-4 flex flex-col gap-3 rounded-[22px] border border-border bg-surface px-4 py-[14px] ipad:mx-0 ipad-lg:col-span-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[19px] font-semibold">{t('missions.title')}</h2>
              {missions ? (
                <span className="text-[13px] font-semibold text-muted-foreground">
                  {t('missions.progress', { done: doneCount, total: missions.length })}
                </span>
              ) : null}
            </div>
            {missions ? (
              <>
                <MissionList missions={missions} />
                <p className="flex items-center gap-2 rounded-tile bg-gold-soft px-2.5 py-2 text-[13px] text-gold-soft-text">
                  <GoldenBloomIcon width={18} height={18} centreFirst />
                  <span>
                    {t.rich(
                      goldenBloom
                        ? 'missions.goldenBloomEarned'
                        : missions.length === 1
                          ? 'missions.goldenBloomOne'
                          : 'missions.goldenBloom',
                      { total: missions.length, b: (c) => <b>{c}</b> },
                    )}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-[13px] text-muted-foreground">{t('missions.comingSoon')}</p>
            )}
          </section>

          {ripens ? (
            <div className="flex flex-col gap-2.5 px-4 ipad:px-0 ipad-lg:col-span-6">
              <p className="flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
                <BellIcon width={16} height={16} />
                <span>
                  {t.rich('ripens', {
                    time: f.clock(ripens.time),
                    count: ripens.count,
                    b: (c) => <b className="text-text">{c}</b>,
                  })}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <GardenTabBar active="garden" sticky={stickyNav} />
    </div>
  );
}

/** A1's header (date, greeting, streak pill), shared with A1b All watered. */
export function HomeHeader({
  date,
  greeting,
  name,
  streakDays,
}: Pick<TodaysGardenScreenProps, 'date' | 'greeting' | 'name' | 'streakDays'>) {
  const t = useTranslations('screens.home');
  const f = useGardenFormat();
  return (
    <header className="flex items-end gap-3 px-5">
      <div className="flex flex-grow flex-col">
        <span className="text-[13px] font-medium text-muted-foreground">{f.longDay(date)}</span>
        <h1 className="font-display text-[28px] font-semibold leading-[1.1]">
          {name ? t(`greeting.${greeting}`, { name }) : t(`greetingNoName.${greeting}`)}
        </h1>
      </div>
      {streakDays !== null ? (
        <StreakPill
          count={f.number(streakDays)}
          unit={t('streakUnit', { count: streakDays })}
          label={t('streakLabel', { count: streakDays })}
        />
      ) : null}
    </header>
  );
}

type Kind = 'water' | 'plant' | 'challenge' | 'speak';

function kindOf(item: MissionItem): Kind {
  return item.kind === 'thirsty' ? 'water' : item.kind;
}

/** Done / total for every kind (the challenge counts as 0 or 1 of 1). */
function counts(item: MissionItem): { done: number; total: number } {
  if (item.kind === 'challenge') return { done: item.done ? 1 : 0, total: 1 };
  return { done: item.done, total: item.total };
}

/**
 * Next up = the first mission that isn't done. Then = the rest, open
 * ones first (in their order), done ones after them.
 */
function MissionList({ missions }: { missions: readonly MissionItem[] }) {
  const t = useTranslations('screens.home.missions');
  const nextIndex = missions.findIndex((m) => missionStatus(m) !== 'done');
  const rest = missions.filter((_, i) => i !== nextIndex);
  const then = [
    ...rest.filter((m) => missionStatus(m) !== 'done'),
    ...rest.filter((m) => missionStatus(m) === 'done'),
  ];

  return (
    <>
      {nextIndex >= 0 ? <NextUp item={missions[nextIndex]!} /> : null}
      {then.length > 0 ? (
        <>
          {nextIndex >= 0 ? (
            <h3 className="mt-0.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">
              {t('then')}
            </h3>
          ) : null}
          <ul className="flex flex-col gap-3">
            {then.map((item, index) => (
              <li key={index}>
                <ThenRow item={item} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

function useMissionTitle() {
  const t = useTranslations('screens.home.missions');
  return (item: MissionItem, next: boolean): string => {
    const { done, total } = counts(item);
    switch (kindOf(item)) {
      case 'water':
        // Next up counts down what is still thirsty, as on the canvas.
        return next ? t('nextWater', { count: total - done }) : t('thirsty');
      case 'plant':
        return t('plant', { count: total });
      case 'speak':
        return t('speak', { count: total });
      case 'challenge':
        return t('challenge');
    }
  };
}

function minutesOf(item: MissionItem): number | null {
  return item.kind === 'challenge' || item.kind === 'speak' ? item.minutes : null;
}

/** Canvas A1 "Next up": light blue panel, 44px icon, title, bar, progress line, Start button. */
function NextUp({ item }: { item: MissionItem }) {
  const t = useTranslations('screens.home.missions');
  const title = useMissionTitle()(item, true);
  const kind = kindOf(item);
  const { done, total } = counts(item);
  const minutes = minutesOf(item);
  const percent = total > 0 ? Math.round((Math.min(done, total) / total) * 100) : 0;
  const progress = done === 0 ? t('notStarted') : t('nextProgress', { done, total });
  const progressLine =
    minutes !== null ? `${progress} · ${t('nextMinutes', { count: minutes })}` : progress;

  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] bg-water-panel p-[14px]">
      <h3 className="text-[11px] font-extrabold uppercase tracking-[.08em] text-water-deep">
        {t('nextUp')}
      </h3>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface"
        >
          <MissionIcon kind={kind} size={22} />
        </span>
        <div className="flex flex-grow flex-col gap-1">
          <span className="text-[17px] font-bold">{title}</span>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(done, total)}
            aria-valuetext={progress}
            aria-label={title}
            className="h-1.5 rounded-[3px] bg-water-track"
          >
            {percent > 0 ? (
              <div
                className="h-1.5 rounded-[3px] bg-water transition-[width] duration-quick ease-garden"
                style={{ width: `${percent}%` }}
              />
            ) : null}
          </div>
          <span className="text-[12px] text-soft-text">{progressLine}</span>
        </div>
      </div>
      {item.href ? (
        <Link
          href={item.href}
          className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] bg-water text-[16px] font-bold text-white shadow-[0_3px_0_var(--color-water-deep)] active:translate-y-px active:shadow-[0_2px_0_var(--color-water-deep)]"
        >
          {t(`start.${kind}`)}
          <ArrowRightIcon width={18} height={18} strokeWidth="2.6" stroke="var(--color-surface)" />
        </Link>
      ) : null}
    </div>
  );
}

const THEN_WELL: Record<Kind, string> = {
  water: 'bg-water-soft',
  plant: 'bg-rating-good',
  challenge: 'bg-gold-wash',
  speak: 'bg-primary-soft',
};

/** Canvas A1 "Then" row: 32px icon well, 15px title, value on the right. */
function ThenRow({ item }: { item: MissionItem }) {
  const t = useTranslations('screens.home.missions');
  const title = useMissionTitle()(item, false);
  const kind = kindOf(item);
  const done = missionStatus(item) === 'done';
  const { done: count, total } = counts(item);
  const minutes = minutesOf(item);

  const value = done
    ? t('valueDone')
    : count === 0 && minutes !== null
      ? t('valueMinutes', { count: minutes })
      : kind === 'water'
        ? t('valueLeft', { count: total - count })
        : t('valueCount', { done: count, total });
  const progress = done
    ? t('valueDone')
    : count === 0
      ? t('notStarted')
      : t('nextProgress', { done: count, total });

  const body = (
    <>
      <span
        aria-hidden="true"
        className={gcn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          done ? 'bg-success' : THEN_WELL[kind],
        )}
      >
        {done ? (
          <CheckIcon width={14} height={14} stroke="var(--color-surface)" />
        ) : (
          <MissionIcon kind={kind} size={16} />
        )}
      </span>
      <span className="flex-grow text-[15px] font-bold">
        {title}
        <span className="sr-only">{`, ${progress}`}</span>
      </span>
      <span
        aria-hidden="true"
        className={gcn(
          'whitespace-nowrap text-[13px] font-semibold',
          done ? 'text-success' : kind === 'speak' ? 'text-primary-text' : 'text-muted-foreground',
        )}
      >
        {value}
      </span>
    </>
  );

  const rowClass = 'flex items-center gap-2.5 text-text';
  if (done || !item.href) return <div className={rowClass}>{body}</div>;
  return (
    <Link
      href={item.href}
      className={gcn(
        rowClass,
        '-mx-1.5 -my-1 rounded-control px-1.5 py-1 transition-colors duration-quick ease-garden hover:bg-surface-sunken active:bg-surface-sunken',
      )}
    >
      {body}
    </Link>
  );
}

function MissionIcon({ kind, size }: { kind: Kind; size: number }) {
  switch (kind) {
    case 'water':
      return <WaterIcon width={size} height={size} />;
    case 'plant':
      return <PlantIcon width={size} height={size} stroke="var(--color-forest)" />;
    case 'challenge':
      return <ChallengeIcon width={size} height={size} />;
    case 'speak':
      return <MicIcon width={size} height={size} stroke="var(--color-primary)" />;
  }
}
