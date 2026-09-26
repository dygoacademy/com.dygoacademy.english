'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import type { MeaningLocale } from '@/i18n/config';

import { gcn } from '../cn';
import { useGardenFormat, type ClockTime } from '../format';
import { GardenCalendar, type CalendarLevel } from '../GardenCalendar';
import {
  BellIcon,
  FamilyIcon,
  GoldenBloomIcon,
  HarvestFruitIcon,
  MissionsTabIcon,
  TranslateIcon,
} from '../icons';
import { Keepsake } from '../Keepsake';
import { SettingsList, SettingsRow } from '../SettingsList';
import { StatTile } from '../StatTile';
import { Switch } from '../Switch';
import { GardenTabBar, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A8 · Me (canvas `reference/A8-me`).
 *
 * Profile → four stats → the garden calendar (16 weeks) → keepsakes →
 * settings (daily goal, the ripening reminder switch, meaning language,
 * family) → tab bar. Unknown numbers show "—"; blocks whose data doesn't
 * exist yet (calendar of missions, keepsakes) say so instead.
 */
export type KeepsakeItem =
  | { type: 'firstHarvest' }
  | { type: 'streak'; days: number }
  | { type: 'blooms'; count: number }
  | { type: 'nextWords'; current: number; target: number };

export interface MeScreenProps {
  name: string;
  /** "IELTS Academic · target band 7.0"; null hides the line. */
  goal: { exam: string; band: number } | null;
  /** The test day, 'unset' for the "add date" chip, null hides the chip. */
  testDay: Date | 'unset' | null;
  stats: {
    fruiting: number | null;
    bestStreak: number | null;
    hours: number | null;
    goldenBlooms: number | null;
  };
  calendar: ReadonlyArray<ReadonlyArray<CalendarLevel | null>> | null;
  keepsakes: readonly KeepsakeItem[] | null;
  dailyGoal: { missions: number; minutes: number; href: string } | null;
  reminder: { time: ClockTime; on: boolean } | null;
  onReminderChange?: (on: boolean) => void;
  /**
   * The review card's meaning language ('none' = English only); null
   * while unknown. The row opens the language sheet (`onLanguageClick`).
   */
  meanings: MeaningLocale | 'none' | null;
  onLanguageClick?: () => void;
  family: { name: string; href: string } | null;
  stickyNav?: boolean;
}

const ICON = { width: 20, height: 20, stroke: 'var(--color-forest)' } as const;

export function MeScreen({
  name,
  goal,
  testDay,
  stats,
  calendar,
  keepsakes,
  dailyGoal,
  reminder,
  onReminderChange,
  meanings,
  onLanguageClick,
  family,
  stickyNav = true,
}: MeScreenProps) {
  const t = useTranslations('screens.me');
  const f = useGardenFormat();
  const [remindOn, setRemindOn] = React.useState(reminder?.on ?? false);
  const dash = t('unknown');
  const num = (value: number | null) => (value === null ? dash : f.number(value));

  return (
    <div className={gcn(SCREEN_CLASSES, 'gap-3 pt-[22px]')}>
      <header className="flex items-center gap-[14px] px-5">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[32px] bg-garden-forest font-display text-[28px] font-semibold text-garden-gold-light"
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex flex-grow flex-col gap-1">
          <h1 className="font-display text-[24px] font-semibold leading-[1.1]">{name}</h1>
          {goal ? (
            <span className="text-[13px] text-garden-muted">
              {t('goal', { exam: goal.exam, band: goal.band })}
            </span>
          ) : null}
          {testDay ? (
            <span className="self-start rounded-[10px] bg-rating-again px-2.5 py-[3px] text-[12px] font-bold text-garden-primary-shadow">
              {t('testDay', {
                date: testDay === 'unset' ? t('testDayUnset') : f.dayMonth(testDay),
              })}
            </span>
          ) : null}
        </div>
      </header>

      <div className="mx-4 grid grid-cols-4 gap-2">
        <StatTile size="sm" tone="forest" value={num(stats.fruiting)} label={t('stats.fruiting')} />
        <StatTile size="sm" value={num(stats.bestStreak)} label={t('stats.bestStreak')} />
        <StatTile
          size="sm"
          value={stats.hours === null ? dash : t('stats.hours', { count: stats.hours })}
          label={t('stats.inGarden')}
        />
        <StatTile
          size="sm"
          tone="gold"
          value={num(stats.goldenBlooms)}
          label={t('stats.goldenBlooms')}
        />
      </div>

      <section className="mx-4 flex flex-col gap-2.5 rounded-card border border-garden-border bg-garden-surface px-4 py-[14px]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[17px] font-semibold">{t('calendarTitle')}</h2>
          <span className="text-[12px] text-garden-muted">{t('calendarRange')}</span>
        </div>
        {calendar ? (
          <GardenCalendar
            weeks={calendar}
            label={t('calendarLabel')}
            legend={t('calendarLegend')}
            low="0"
            high="3"
          />
        ) : (
          <p className="text-[13px] text-garden-muted">{t('comingSoon')}</p>
        )}
      </section>

      <section className="mx-4 flex flex-col gap-2">
        <h2 className="font-display text-[17px] font-semibold">{t('keepsakesTitle')}</h2>
        {keepsakes ? (
          <div className="grid grid-cols-4 gap-2">
            {keepsakes.map((item, index) => {
              switch (item.type) {
                case 'firstHarvest':
                  return (
                    <Keepsake
                      key={index}
                      label={t('keepsake.firstHarvest')}
                      icon={<HarvestFruitIcon width={30} height={30} />}
                    />
                  );
                case 'streak':
                  return (
                    <Keepsake
                      key={index}
                      label={t('keepsake.streak', { count: item.days })}
                      number={f.number(item.days)}
                    />
                  );
                case 'blooms':
                  return (
                    <Keepsake
                      key={index}
                      label={t('keepsake.blooms', { count: item.count })}
                      icon={
                        <GoldenBloomIcon
                          width={30}
                          height={30}
                          stemTo={23}
                          stem="var(--stage-sprout-leaf)"
                        />
                      }
                    />
                  );
                case 'nextWords':
                  return (
                    <Keepsake
                      key={index}
                      label={t('keepsake.next', { count: item.target })}
                      progress={{
                        percent: Math.round((item.current / item.target) * 100),
                        value: f.number(item.current),
                      }}
                    />
                  );
              }
            })}
          </div>
        ) : (
          <p className="text-[13px] text-garden-muted">{t('comingSoon')}</p>
        )}
      </section>

      <SettingsList className="mx-4">
        <SettingsRow
          icon={<MissionsTabIcon {...ICON} strokeLinejoin={undefined} />}
          label={t('dailyGoal')}
          value={
            dailyGoal
              ? t('dailyGoalValue', { missions: dailyGoal.missions, minutes: dailyGoal.minutes })
              : t('comingSoonShort')
          }
          href={dailyGoal?.href}
          chevron={!dailyGoal}
        />
        <SettingsRow
          icon={<BellIcon {...ICON} />}
          label={t('reminder')}
          labelId="garden-me-reminder"
          value={reminder ? f.clock(reminder.time) : undefined}
          control={
            reminder ? (
              <Switch
                size="sm"
                checked={remindOn}
                aria-labelledby="garden-me-reminder"
                onCheckedChange={(on) => {
                  setRemindOn(on);
                  onReminderChange?.(on);
                }}
              />
            ) : undefined
          }
        />
        <SettingsRow
          icon={<TranslateIcon {...ICON} />}
          label={t('meanings')}
          value={meanings ? t(`meaningsValue.${meanings}`) : t('comingSoonShort')}
          onClick={onLanguageClick}
          chevron
        />
        {family ? (
          <SettingsRow
            icon={<FamilyIcon {...ICON} />}
            label={t('family')}
            value={t('familyValue', { name: family.name })}
            href={family.href}
          />
        ) : null}
      </SettingsList>

      <GardenTabBar active="me" sticky={stickyNav} />
    </div>
  );
}
