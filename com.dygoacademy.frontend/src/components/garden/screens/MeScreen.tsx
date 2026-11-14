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
 * iA8 (canvas `reference/iA8-me`, iPad landscape with the iPad nav,
 * `ipad-lg:`): a bigger header (72px avatar, the goal and test-day chip on
 * one line), the four stats, then the calendar (22px squares) beside the
 * keepsakes card, then the settings as a 2-column card. `sidebar` and
 * `sidebarFooter` go into the iPad sidebar (shared gardens, the streak).
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
  reminder: {
    time: ClockTime;
    on: boolean;
    blocked?: 'install' | 'unsupported' | 'blocked' | null;
  } | null;
  onReminderChange?: (on: boolean) => void;
  /** A8c: the reminder row's label opens the Reminder screen; the switch stays. */
  reminderHref?: string;
  /**
   * The review card's meaning language ('none' = English only); null
   * while unknown. The row opens the language sheet (`onLanguageClick`).
   */
  meanings: MeaningLocale | 'none' | null;
  onLanguageClick?: () => void;
  /** A8d: the row links to the Meanings in screen instead. */
  meaningsHref?: string;
  family: { name: string; href: string } | null;
  /** A8 "Privacy & data" row (voice donation on/off); null hides it. */
  privacy?: { donating: boolean; href: string } | null;
  /**
   * The gear (aria-label "Account"): opens the Account sheet. Gets the
   * gear, so the iPad popover (iA8-me-account) can hang under it.
   */
  onAccountClick?: (anchor: HTMLElement) => void;
  stickyNav?: boolean;
  /** iPad sidebar, under its tabs (iA8: the shared gardens). */
  sidebar?: React.ReactNode;
  /** iPad sidebar, at the bottom (iA8: the streak card). */
  sidebarFooter?: React.ReactNode;
}

/** IELTS bands are written "7.0" in every language (a score, not a quantity). */
const BAND_FORMAT = new Intl.NumberFormat('en', { minimumFractionDigits: 1 });

/** iA8: 14px apart, 14/16px padding, 28px numbers, 13px labels. */
const STATS = gcn(
  'mx-4 grid grid-cols-4 gap-2 ipad:mx-0 ipad-lg:col-span-2 ipad-lg:gap-[14px]',
  'ipad-lg:[&>div]:px-4 ipad-lg:[&>div]:py-[14px]',
  'ipad-lg:[&>div>span:first-child]:text-[28px] ipad-lg:[&>div>span:last-child]:text-[13px]',
);

/**
 * iA8: one card of two columns, 56px rows with 18px sides; a line right
 * of the left column, none under the last row.
 */
const SETTINGS = gcn(
  'mx-4 ipad:mx-0 ipad-lg:col-span-2 ipad-lg:grid ipad-lg:grid-cols-2 ipad-lg:overflow-hidden ipad-lg:rounded-[24px]',
  'ipad-lg:[&>*]:h-14 ipad-lg:[&>*]:px-[18px]',
  'ipad-lg:[&>*:nth-child(odd)]:border-r ipad-lg:[&>*:nth-child(odd):nth-last-child(-n+2)]:border-b-0',
);

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
  reminderHref,
  meanings,
  onLanguageClick,
  meaningsHref,
  family,
  privacy = null,
  onAccountClick,
  stickyNav = true,
  sidebar,
  sidebarFooter,
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
        'ipad-lg:gap-5 ipad-lg:pb-7 ipad-lg:px-9 ipad-lg:pt-8',
      )}
    >
      <header className="flex items-center gap-[14px] px-5 ipad-lg:gap-4 ipad-lg:px-0">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[32px] bg-forest font-display text-[28px] font-semibold text-gold-light ipad-lg:h-[72px] ipad-lg:w-[72px] ipad-lg:rounded-[36px] ipad-lg:text-[32px]"
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex flex-grow flex-col gap-1">
          <h1 className="font-display text-[24px] font-semibold leading-[1.1] ipad-lg:text-[30px]">
            {name}
          </h1>
          <div className="contents ipad-lg:flex ipad-lg:items-center ipad-lg:gap-2.5">
            {goal ? (
              <span className="text-[13px] text-muted-foreground ipad-lg:text-[14px]">
                {t('goal', {
                  exam: goal.exam,
                  band: BAND_FORMAT.format(goal.band),
                })}
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
        </div>
        <IconButton
          aria-label={t('account')}
          aria-haspopup="dialog"
          onClick={(event) => onAccountClick?.(event.currentTarget)}
          className="self-start text-forest ipad-lg:self-center"
        >
          <GearIcon width={22} height={22} />
        </IconButton>
      </header>

      {/*
        Design system §10, A8: iPad shows 2 columns, stats + calendar on
        the left, keepsakes + settings on the right; iPhone stacks them.
      */}
      {/*
        iA8 (landscape): the columns dissolve into one grid, stats across,
        calendar 1.7fr beside keepsakes 1fr, then the settings across.
      */}
      <div className="contents ipad:mx-4 ipad:grid ipad:grid-cols-2 ipad:items-start ipad:gap-4 ipad-lg:mx-0 ipad-lg:grid-cols-[1.7fr_1fr] ipad-lg:items-stretch ipad-lg:gap-x-4 ipad-lg:gap-y-5">
        <div className="contents ipad:flex ipad:flex-col ipad:gap-3 ipad-lg:contents">
          <div className={STATS}>
            <StatTile
              size="sm"
              tone="forest"
              value={num(stats.fruiting)}
              label={t('stats.fruiting')}
            />
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

          <section className="mx-4 flex flex-col gap-2.5 rounded-card border border-border bg-surface px-4 py-[14px] ipad:mx-0 ipad-lg:rounded-[24px] ipad-lg:px-5 ipad-lg:py-[18px]">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[17px] font-semibold ipad-lg:text-[20px]">
                {t('calendarTitle')}
              </h2>
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

        <div className="contents ipad:flex ipad:flex-col ipad:gap-3 ipad-lg:contents">
          <section className="mx-4 flex flex-col gap-2 ipad:mx-0 ipad-lg:gap-[14px] ipad-lg:rounded-[24px] ipad-lg:border ipad-lg:border-border ipad-lg:bg-surface ipad-lg:px-5 ipad-lg:py-[18px]">
            <h2 className="font-display text-[17px] font-semibold ipad-lg:text-[20px]">
              {t('keepsakesTitle')}
            </h2>
            {keepsakes ? (
              <div className="grid grid-cols-4 gap-2 ipad-lg:grid-cols-2 ipad-lg:gap-x-2.5 ipad-lg:gap-y-4">
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

          <SettingsList className={SETTINGS}>
            <SettingsRow
              icon={<MissionsTabIcon {...ICON} strokeLinejoin={undefined} />}
              label={t('dailyGoal')}
              value={
                dailyGoal
                  ? t('dailyGoalValue', {
                      missions: dailyGoal.missions,
                      minutes: dailyGoal.minutes,
                    })
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
              href={reminder ? reminderHref : undefined}
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
              href={meaningsHref}
              onClick={meaningsHref ? undefined : onLanguageClick}
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

      <GardenTabBar
        active="me"
        sticky={stickyNav}
        sidebar={sidebar}
        sidebarFooter={sidebarFooter}
      />
    </div>
  );
}
