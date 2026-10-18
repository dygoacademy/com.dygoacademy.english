import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { BeeShape } from '../Bee';
import { gcn } from '../cn';
import { useGardenFormat } from '../format';
import { CheckIcon, MicIcon, RainBarrelIcon, SeedPackIcon, WaterIcon, WiltingPlantIcon } from '../icons';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A4 · This week (canvas `reference/A4-weekly-harvest`, `-done`; redrawn
 * 2026-10-17). Props only.
 *
 * Header "Week of … · n days left" → forest card with the "+1 rain barrel"
 * reward and one bar per mission (2026-10-18: every tab opens with a forest
 * block) → the 3 weekly missions (Rescue wilting
 * words or Water 20 words, Use it in a sentence, Sound of the week), each
 * row a link to the screen where the practice happens, and while one is in
 * progress the seed pack line → Road to Band 7 →
 * tab bar. Daily missions stay on A1 (the week's daily-mission plants were
 * dropped 2026-10-18: they repeated A1 and gave nothing to do).
 */
export type WeeklyMissionKey = 'rescue' | 'water' | 'sentence' | 'sound';

export interface WeeklyMissionRow {
  key: WeeklyMissionKey;
  goal: number;
  count: number;
  done: boolean;
  /** Where the row goes: the leech drill, Review, the sentence flow or Pronunciation. */
  href: string;
}

export interface WeeklyHarvestScreenProps {
  /** The week's Monday (format.ts calendar day), shown as "Week of 12 October". */
  weekStart: Date;
  /** Days after today until Sunday. */
  daysLeft: number;
  weekly: {
    /** Always 3, in display order. */
    missions: readonly WeeklyMissionRow[];
    /** Wilting words now (the Rescue row's line). */
    wilting: number;
    sound: { label: string; examples: readonly string[] };
    rewardEarned: boolean;
  } | null;
  /** The seed pack in progress, shown inside the missions card. */
  seedPack: { name: string; need: number; have: number } | null;
  goal: {
    /** The target band ("Road to Band 7"). */
    band: number;
    mastered: number;
    target: number;
    growing: number;
  } | null;
  stickyNav?: boolean;
}

const ICON_WELL: Record<WeeklyMissionKey, string> = {
  rescue: 'bg-wilt-wash',
  water: 'bg-water-soft',
  sentence: 'bg-primary-soft',
  sound: 'bg-gold-soft',
};

function MissionIcon({ kind }: { kind: WeeklyMissionKey }) {
  switch (kind) {
    case 'rescue':
      return <WiltingPlantIcon width={30} height={30} />;
    case 'water':
      return <WaterIcon width={26} height={26} />;
    case 'sentence':
      return <MicIcon width={26} height={26} className="text-primary" />;
    case 'sound':
      return (
        <svg width={34} height={34} viewBox="-17 -17 34 34" aria-hidden="true" focusable="false">
          <g transform="scale(0.95)">
            <g transform="translate(-16,-17)">
              <BeeShape />
            </g>
          </g>
        </svg>
      );
  }
}

function SoundChip({ children }: { children: React.ReactNode }) {
  return (
    <span lang="en" className="rounded-[6px] bg-gold-soft px-[5px] font-display text-gold-soft-text">
      {children}
    </span>
  );
}

export function WeeklyHarvestScreen({
  weekStart,
  daysLeft,
  weekly,
  seedPack,
  goal,
  stickyNav = true,
}: WeeklyHarvestScreenProps) {
  const t = useTranslations('screens.harvest');
  const tw = useTranslations('screens.missions.weekly');
  const f = useGardenFormat();
  const locale = useLocale();

  const masteredPct = goal && goal.target > 0 ? Math.round((goal.mastered / goal.target) * 100) : 0;
  const growingPct = goal && goal.target > 0 ? Math.round((goal.growing / goal.target) * 100) : 0;
  const doneCount = weekly ? weekly.missions.filter((m) => m.done).length : 0;

  const title = (row: WeeklyMissionRow): React.ReactNode => {
    switch (row.key) {
      case 'rescue':
        return tw('rescueTitle');
      case 'water':
        return tw('waterTitle', { goal: row.goal });
      case 'sentence':
        return tw('sentenceTitle');
      case 'sound':
        return tw.rich('soundTitle', {
          sound: weekly?.sound.label ?? '',
          chip: (c) => <SoundChip>{c}</SoundChip>,
        });
    }
  };
  const sub = (row: WeeklyMissionRow): React.ReactNode => {
    switch (row.key) {
      case 'rescue':
        return tw('rescueSub', { count: weekly?.wilting ?? 0 });
      case 'water':
        return tw('waterSub');
      case 'sentence':
        return tw('sentenceSub', { goal: row.goal });
      case 'sound':
        return weekly?.sound.examples.length
          ? tw.rich('soundSubExamples', {
              goal: row.goal,
              sound: weekly.sound.label,
              examples: weekly.sound.examples.join(', '),
              ex: (c) => <span lang="en">{c}</span>,
            })
          : tw('soundSub', { goal: row.goal, sound: weekly?.sound.label ?? '' });
    }
  };

  return (
    <div className={gcn(SCREEN_CLASSES, IPAD_NAV_COLUMN, 'gap-3 pt-[22px]')}>
      <header className="flex flex-col px-5">
        <span className="text-[13px] font-medium text-muted-foreground">
          {tw('weekOf', {
            date: locale.startsWith('vi') ? f.shortDay(weekStart) : f.dayMonth(weekStart),
            days: daysLeft,
          })}
        </span>
        <h1 className="font-display text-[28px] font-semibold leading-[1.1]">{tw('title')}</h1>
      </header>

      {weekly ? (
        <section className="mx-4 flex flex-col gap-2.5 rounded-[22px] bg-forest p-4 text-on-forest">
          <div className="flex items-center gap-2.5">
            <RainBarrelIcon width={28} height={28} stroke="var(--color-gold-light)" />
            <span className="flex-grow text-[15px] leading-[1.35]">
              {tw.rich(weekly.rewardEarned ? 'rewardDone' : 'rewardTodo', {
                b: (c) => <b className="text-gold-light">{c}</b>,
              })}
            </span>
            <span className="font-display text-[22px] font-semibold text-gold-light">
              {tw('rewardCount', { done: doneCount })}
            </span>
          </div>
          <div aria-hidden="true" className="grid grid-cols-3 gap-1.5">
            {weekly.missions.map((row) => (
              <span
                key={row.key}
                className={gcn('h-2 rounded-[4px]', row.done ? 'bg-gold-light' : 'bg-on-forest-line')}
              />
            ))}
          </div>
        </section>
      ) : null}

      {weekly ? (
        <section
          aria-label={tw('label')}
          className="mx-4 flex flex-col rounded-[22px] border border-border bg-surface px-4 pb-1 pt-1"
        >
          {weekly.missions.map((row, index) => (
            <Link
              key={row.key}
              href={row.href}
              className={gcn(
                'flex items-center gap-3 py-3 text-text',
                index > 0 && 'border-t border-divider',
              )}
            >
              <span
                className={gcn(
                  'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]',
                  ICON_WELL[row.key],
                )}
              >
                <MissionIcon kind={row.key} />
                {row.done ? (
                  <span className="absolute -bottom-1 -right-1 box-content flex h-[22px] w-[22px] items-center justify-center rounded-[11px] border-2 border-surface bg-success">
                    <CheckIcon width={12} height={12} strokeWidth="3.4" className="text-white" />
                  </span>
                ) : null}
              </span>
              <span className="flex min-w-0 flex-grow flex-col gap-1">
                <span className="text-[16px] font-bold leading-[1.25]">{title(row)}</span>
                <span className="text-[12px] leading-[1.35] text-muted-foreground">{sub(row)}</span>
                <span className="flex items-center gap-2">
                  <span className="flex h-1.5 flex-grow overflow-hidden rounded-[3px] bg-track">
                    <span
                      className={row.done ? 'bg-success' : 'bg-stage-tree-fruit'}
                      style={{
                        width: `${row.goal > 0 ? Math.round((Math.min(row.count, row.goal) / row.goal) * 100) : 0}%`,
                      }}
                    />
                  </span>
                  <span
                    className={gcn(
                      'whitespace-nowrap text-[12px] font-bold',
                      row.done ? 'text-success' : 'text-gold-soft-text',
                    )}
                  >
                    {tw('progress', { count: row.count, goal: row.goal })}
                  </span>
                </span>
              </span>
              {row.done ? (
                <span className="shrink-0 text-[13px] font-bold text-success">{tw('done')}</span>
              ) : (
                <span className="flex h-9 shrink-0 items-center rounded-[18px] bg-forest px-3 text-[13px] font-bold text-white">
                  {tw(`${row.key}Action`)}
                </span>
              )}
            </Link>
          ))}
          {seedPack ? (
            <div className="mb-2 mt-0.5 flex items-center gap-2 rounded-[12px] bg-gold-soft px-[10px] py-2 text-[13px]">
              <SeedPackIcon width={22} height={22} />
              <span className="flex-grow leading-[1.35] text-soft-text">
                {t.rich('seedPack', {
                  need: seedPack.need,
                  name: seedPack.name,
                  b: (c) => <b className="text-text">{c}</b>,
                })}
              </span>
              <span className="font-bold text-gold-soft-text">
                {t('seedPackCount', { have: seedPack.have, need: seedPack.need })}
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mx-4 flex flex-col gap-2 rounded-[22px] border border-border bg-surface px-4 py-3">
        {goal ? (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[17px] font-semibold">
                {t('goalBand', { band: goal.band })}
              </h2>
              <span className="text-[12px] text-muted-foreground">{t('goalHint')}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[26px] font-semibold text-forest">
                {f.number(goal.mastered)}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {t('goalMastered', { target: goal.target })}
              </span>
            </div>
            <div
              role="img"
              aria-label={t('goalBar', {
                mastered: goal.mastered,
                growing: goal.growing,
                target: goal.target,
              })}
              className="flex h-2 overflow-hidden rounded-[4px] bg-track"
            >
              <div className="bg-success" style={{ width: `${masteredPct}%` }} />
              <div className="bg-stage-sprout" style={{ width: `${growingPct}%` }} />
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-[17px] font-semibold">{t('goalTitle')}</h2>
            <p className="text-[13px] text-muted-foreground">{t('goalComingSoon')}</p>
          </>
        )}
      </section>

      <GardenTabBar active="missions" sticky={stickyNav} />
    </div>
  );
}
