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
  GearIcon,
  GoldenBloomIcon,
  HarvestFruitIcon,
  MissionsTabIcon,
  ShieldCheckIcon,
  TranslateIcon,
} from '../icons';
import { Keepsake } from '../Keepsake';
import { SettingsList, SettingsRow } from '../SettingsList';
import { StatTile } from '../StatTile';
import { Switch } from '../Switch';
import { IconButton } from '../IconButton';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A8 · Me (canvas `reference/A8-me`).
 *
 * Profile → four stats → the garden calendar (16 weeks) → keepsakes →
 * settings (daily goal, the ripening reminder switch, meaning language,
 * family) → tab bar. Unknown numbers show "—"; blocks whose data doesn't
 * exist yet (calendar of missions, keepsakes) say so instead.
 *
 * SO-1: a gear at the top right of the profile opens the Account sheet
 * (`onAccountClick`; the caller renders the sheet).
 *
 * Voice donation (canvas 2026-10-11): `privacy` adds the "Privacy & data"
 * row (→ A8e) after "Meanings in"; to fit it the screen is a little
 * tighter (10px gaps, 18px top, 48px rows, 9px calendar squares).
 */
export type KeepsakeItem =
  | { type: 'firstHarvest' }
  | { type: 'streak'; days: number }
  | { type: 'blooms'; count: number }
  | { type: 'nextWords'; current: number; target: number }
  | { type: 'nextStreak'; current: number; target: number }
  | { type: 'nextBlooms'; current: number; target: number };

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
  /** The row links to `href`, or (U6-7) opens the goal sheet via `onDailyGoalClick`. */
  dailyGoal: { missions: number; minutes: number; href?: string } | null;
  onDailyGoalClick?: () => void;
  /** `blocked`: why this browser can't get reminders; the row then says so instead of showing a switch. */
  reminder: { time: ClockTime; on: boolean; blocked?: 'install' | 'unsupported' | 'blocked' | null } | null;
  onReminderChange?: (on: boolean) => void;
  /**
   * The review card's meaning language ('none' = English only); null
   * while unknown. The row opens the language sheet (`onLanguageClick`).
   */
  meanings: MeaningLocale | 'none' | null;
  onLanguageClick?: () => void;
  family: { name: string; href: string } | null;
  /** A8 "Privacy & data" row (voice donation on/off); null hides it. */
  privacy?: { donating: boolean; href: string } | null;
  /** The gear (aria-label "Account"): opens the Account sheet. */
  onAccountClick?: () => void;
  stickyNav?: boolean;
}

/** IELTS bands are written "7.0" in every language (a score, not a quantity). */
const BAND_FORMAT = new Intl.NumberFormat('en', { minimumFractionDigits: 1 });

const ICON = { width: 20, height: 20, stroke: 'var(--color-forest)' } as const;

export function MeScreen({
  name,
  goal,
  testDay,
  stats,
  calendar,
  keepsakes,
  dailyGoal,
  onDailyGoalClick,
  reminder,
  onReminderChange,
  meanings,
  onLanguageClick,
  family,
  privacy = null,
  onAccountClick,
  stickyNav = true,
}: MeScreenProps) {
  const t = useTranslations('screens.me');
  const f = useGardenFormat();
  const [remindOn, setRemindOn] = React.useState(reminder?.on ?? false);
  const dash = t('unknown');
  const num = (value: number | null) => (value === null ? dash : f.number(value));
  const compact = privacy !== null;

  return (
    <div
      className={gcn(
        SCREEN_CLASSES,
        IPAD_NAV_COLUMN,
        compact ? 'gap-2.5 pt-[18px]' : 'gap-3 pt-[22px]',
      )}
    >
      <header className="flex items-center gap-[14px] px-5">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[32px] bg-forest font-display text-[28px] font-semibold text-gold-light"
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex flex-grow flex-col gap-1">
          <h1 className="font-display text-[24px] font-semibold leading-[1.1]">{name}</h1>
          {goal ? (
            <span className="text-[13px] text-muted-foreground">
              {t('goal', { exam: goal.exam, band: BAND_FORMAT.format(goal.band) })}
            </span>
          ) : null}
          {testDay ? (
            <span className="self-start rounded-[10px] bg-rating-again px-2.5 py-[3px] text-[12px] font-bold text-primary-shadow">
              {t('testDay', {
                date: testDay === 'unset' ? t('testDayUnset') : f.dayMonth(testDay),
              })}
            </span>
          ) : null}
        </div>
        <IconButton
          aria-label={t('account')}
          aria-haspopup="dialog"
          onClick={onAccountClick}
          className="self-start text-forest"
        >
          <GearIcon width={22} height={22} />
        </IconButton>
      </header>

      {/*
        Design system §10, A8: iPad shows 2 columns, stats + calendar on
        the left, keepsakes + settings on the right; iPhone stacks them.
      */}
      <div className="contents ipad:mx-4 ipad:grid ipad:grid-cols-2 ipad:items-start ipad:gap-4">
        <div className="contents ipad:flex ipad:flex-col ipad:gap-3">
          <div className="mx-4 grid grid-cols-4 gap-2 ipad:mx-0">
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

          <section className="mx-4 flex flex-col gap-2.5 rounded-card border border-border bg-surface px-4 py-[14px] ipad:mx-0">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[17px] font-semibold">{t('calendarTitle')}</h2>
              <span className="text-[12px] text-muted-foreground">{t('calendarRange')}</span>
            </div>
            {calendar ? (
              <GardenCalendar
                weeks={calendar}
                label={t('calendarLabel')}
                legend={t('calendarLegend')}
                low="0"
                high="3"
                compact={compact}
              />
            ) : (
              <p className="text-[13px] text-muted-foreground">{t('comingSoon')}</p>
            )}
          </section>
        </div>

        <div className="contents ipad:flex ipad:flex-col ipad:gap-3">
          <section className="mx-4 flex flex-col gap-2 ipad:mx-0">
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
                    case 'nextStreak':
                    case 'nextBlooms':
                      return (
                        <Keepsake
                          key={index}
                          label={t(
                            item.type === 'nextWords'
                              ? 'keepsake.next'
                              : item.type === 'nextStreak'
                                ? 'keepsake.nextStreak'
                                : 'keepsake.nextBlooms',
                            { count: item.target },
                          )}
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
              <p className="text-[13px] text-muted-foreground">{t('comingSoon')}</p>
            )}
          </section>

          <SettingsList className="mx-4 ipad:mx-0">
            <SettingsRow
              icon={<MissionsTabIcon {...ICON} strokeLinejoin={undefined} />}
              label={t('dailyGoal')}
              value={
                dailyGoal
                  ? t('dailyGoalValue', { missions: dailyGoal.missions, minutes: dailyGoal.minutes })
                  : t('comingSoonShort')
              }
              href={dailyGoal?.href}
              onClick={dailyGoal && !dailyGoal.href ? onDailyGoalClick : undefined}
              chevron={!dailyGoal}
              compact={compact}
            />
            <SettingsRow
              icon={<BellIcon {...ICON} />}
              label={t('reminder')}
              labelId="garden-me-reminder"
              value={
                reminder?.blocked
                  ? t(`reminderBlocked.${reminder.blocked}`)
                  : reminder
                    ? f.clock(reminder.time)
                    : undefined
              }
              compact={compact}
              control={
                reminder && !reminder.blocked ? (
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
              compact={compact}
            />
            {privacy ? (
              <SettingsRow
                icon={<ShieldCheckIcon {...ICON} />}
                label={t('privacy')}
                value={t(privacy.donating ? 'privacyValue.on' : 'privacyValue.off')}
                href={privacy.href}
                compact
              />
            ) : null}
            {family ? (
              <SettingsRow
                icon={<FamilyIcon {...ICON} />}
                label={t('family')}
                value={t('familyValue', { name: family.name })}
                href={family.href}
                compact={compact}
              />
            ) : null}
          </SettingsList>
        </div>
      </div>

      <GardenTabBar active="me" sticky={stickyNav} />
    </div>
  );
}
