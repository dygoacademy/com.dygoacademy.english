import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from '../cn';
import { useGardenFormat } from '../format';
import { RainBarrelIcon, SeedPackIcon } from '../icons';
import { WeekHarvest, type HarvestDay } from '../WeekHarvest';
import { GardenTabBar, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A4 · Weekly harvest (canvas `reference/A4-weekly-harvest`). Props only.
 *
 * The week's plants (one per day, grown by missions done) with the seed
 * pack they unlock → the vocabulary goal → streak freezes and the study
 * group → tab bar. Every block is optional: missions, freezes, groups and
 * goals arrive with UI-6, and until then a block shows "coming soon".
 */
export type AvatarTone = 'flower' | 'sprout' | 'due' | 'more';

export interface WeeklyHarvestScreenProps {
  /** First calendar day of the week (format.ts), shown as "Week of 21 September". */
  weekStart: Date;
  harvest: {
    done: number;
    total: number;
    /** The week's calendar days in the locale's order. */
    days: ReadonlyArray<Omit<HarvestDay, 'plantLabel' | 'label'> & { day: Date }>;
    seedPack: { name: string; need: number; have: number } | null;
  } | null;
  goal: {
    /** The target band ("Road to Band 7"). */
    band: number;
    mastered: number;
    target: number;
    growing: number;
    /** The projected day, 'pending' while it can't be worked out yet; null hides "At this pace". */
    eta: Date | 'pending' | null;
  } | null;
  freezes: number | null;
  group: {
    name: string;
    watered: number;
    members: number;
    plotWords: number;
    avatars: ReadonlyArray<{ text: string; tone: AvatarTone }>;
  } | null;
  stickyNav?: boolean;
}

const AVATAR: Record<AvatarTone, string> = {
  flower: 'bg-stage-flower text-garden-avatar-flower-text',
  sprout: 'bg-stage-sprout-leaf text-garden-avatar-sprout-text',
  due: 'bg-stage-due text-garden-avatar-due-text',
  more: 'bg-garden-track text-garden-muted',
};

function ComingSoon({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-garden-muted">{children}</p>;
}

export function WeeklyHarvestScreen({
  weekStart,
  harvest,
  goal,
  freezes,
  group,
  stickyNav = true,
}: WeeklyHarvestScreenProps) {
  const t = useTranslations('screens.harvest');
  const f = useGardenFormat();

  const masteredPct = goal && goal.target > 0 ? Math.round((goal.mastered / goal.target) * 100) : 0;
  const growingPct = goal && goal.target > 0 ? Math.round((goal.growing / goal.target) * 100) : 0;

  return (
    <div className={gcn(SCREEN_CLASSES, 'gap-[14px] pt-[22px]')}>
      <header className="flex flex-col px-5">
        <span className="text-[13px] font-medium text-garden-muted">
          {t('weekOf', { date: f.dayMonth(weekStart) })}
        </span>
        <h1 className="font-display text-[28px] font-semibold leading-[1.1]">{t('title')}</h1>
      </header>

      <section className="mx-4 flex flex-col gap-3 rounded-[24px] bg-garden-forest p-4 text-garden-on-forest">
        {harvest ? (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-bold">
                {t('missionsCount', { done: harvest.done, total: harvest.total })}
              </h2>
              <span className="text-[12px] text-stage-sprout">{t('missionsHint')}</span>
            </div>
            <WeekHarvest
              days={harvest.days.map((day) => ({
                ...day,
                label: day.today ? t('today') : f.weekdayShort(day.day),
                plantLabel: t('dayPlant', { count: day.missions }),
              }))}
            />
            {harvest.seedPack ? (
              <div className="flex items-center gap-2.5 rounded-[14px] bg-garden-forest-deep px-3 py-2.5">
                <SeedPackIcon width={28} height={28} />
                <span className="flex-grow text-[13px] text-garden-on-forest-muted">
                  {t.rich('seedPack', {
                    need: harvest.seedPack.need,
                    name: harvest.seedPack.name,
                    b: (c) => <b className="whitespace-nowrap text-garden-gold-light">{c}</b>,
                  })}
                </span>
                <span className="text-[13px] font-bold text-garden-gold-light">
                  {t('seedPackCount', { have: harvest.seedPack.have, need: harvest.seedPack.need })}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h2 className="text-[15px] font-bold">{t('missionsTitle')}</h2>
            <p className="text-[13px] text-garden-on-forest-muted">{t('missionsComingSoon')}</p>
          </>
        )}
      </section>

      <section className="mx-4 flex flex-col gap-2.5 rounded-[22px] border border-garden-border bg-garden-surface p-4">
        {goal ? (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[19px] font-semibold">
                {t('goalBand', { band: goal.band })}
              </h2>
              <span className="text-[13px] text-garden-muted">{t('goalHint')}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[32px] font-semibold text-garden-forest">
                {f.number(goal.mastered)}
              </span>
              <span className="text-[14px] text-garden-muted">
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
              className="flex h-2.5 overflow-hidden rounded-[5px] bg-garden-track"
            >
              <div className="bg-garden-success" style={{ width: `${masteredPct}%` }} />
              <div className="bg-stage-sprout" style={{ width: `${growingPct}%` }} />
            </div>
            <div className="flex gap-[14px] text-[12px] text-garden-muted">
              <span className="flex items-center gap-[5px]">
                <span aria-hidden="true" className="h-2 w-2 rounded-[4px] bg-garden-success" />
                {t('legendMastered')}
              </span>
              <span className="flex items-center gap-[5px]">
                <span aria-hidden="true" className="h-2 w-2 rounded-[4px] bg-stage-sprout" />
                {t('legendGrowing', { count: goal.growing })}
              </span>
              {goal.eta ? (
                <span className="ml-auto">
                  {t('eta', {
                    eta: goal.eta === 'pending' ? t('etaPending') : f.dayMonth(goal.eta),
                  })}
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-[19px] font-semibold">{t('goalTitle')}</h2>
            <ComingSoon>{t('goalComingSoon')}</ComingSoon>
          </>
        )}
      </section>

      <div className="mx-4 grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1.5 rounded-card border border-garden-border bg-garden-surface p-[14px]">
          <RainBarrelIcon width={30} height={30} stroke="var(--color-water)" />
          <span className="text-[15px] font-bold">
            {freezes !== null ? t('barrelTitle', { count: freezes }) : t('barrelName')}
          </span>
          <span className="text-[12px] leading-[1.35] text-garden-muted">
            {freezes !== null ? t('barrelBody') : t('comingSoon')}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-card border border-garden-border bg-garden-surface p-[14px]">
          {group ? (
            <>
              <div aria-hidden="true" className="flex">
                {group.avatars.map((avatar, index) => (
                  <span
                    key={index}
                    className={gcn(
                      'box-content flex h-7 w-7 items-center justify-center rounded-[14px] border-2 border-garden-surface text-[11px] font-bold',
                      index > 0 && '-ml-2',
                      AVATAR[avatar.tone],
                    )}
                  >
                    {avatar.text}
                  </span>
                ))}
              </div>
              <span className="text-[15px] font-bold">{group.name}</span>
              <span className="text-[12px] leading-[1.35] text-garden-muted">
                {t('groupBody', {
                  watered: group.watered,
                  members: group.members,
                  words: group.plotWords,
                })}
              </span>
            </>
          ) : (
            <>
              <span className="text-[15px] font-bold">{t('groupName')}</span>
              <span className="text-[12px] leading-[1.35] text-garden-muted">
                {t('comingSoon')}
              </span>
            </>
          )}
        </div>
      </div>

      <GardenTabBar active="missions" sticky={stickyNav} />
    </div>
  );
}
