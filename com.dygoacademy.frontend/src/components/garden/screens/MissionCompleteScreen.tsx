'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { buttonClassName } from '../buttonStyles';
import { useGardenFormat, type ClockTime } from '../format';
import { BellIcon, CloseIcon, GoldenBloomIcon } from '../icons';
import { IconButton } from '../IconButton';
import { StatTile } from '../StatTile';
import { Switch } from '../Switch';
import { WeekDots } from '../WeekDots';

/**
 * A3 · Mission complete (canvas `reference/A3-mission-complete`).
 *
 * The blooming medal and "18 words watered" → three stats → this week's
 * days → the Golden Bloom card with the next mission → the "ripen
 * tomorrow" reminder switch → Back to garden. Unknown numbers show "—";
 * the Golden Bloom card and the week only appear when their data exists.
 */
export interface MissionCompleteScreenProps {
  closeHref: string;
  backHref: string;
  words: number;
  /** "“mitigate” and 4 more just bloomed"; null hides the line. */
  bloomed: { word: string; more: number } | null;
  stats: { recalledPercent: number | null; minutesToday: number | null; streak: number | null };
  /** This week's calendar days in the locale's order (format.ts `weekDays`). */
  week: ReadonlyArray<{ day: Date; state: 'done' | 'today' | 'empty' }> | null;
  /** Null until daily missions exist (UI-6). */
  missions: {
    done: number;
    total: number;
    /** The next mission to do: the collocation challenge, or the SPEAK mission (SE1). */
    next: {
      mission: 'challenge' | 'speak';
      minutes: number | null;
      href: string;
      /** Words to say, for `speak`. */
      count?: number;
    } | null;
  } | null;
  /** The reminder row; null hides it. */
  reminder: { ripening: number; time: ClockTime; on: boolean } | null;
  onReminderChange?: (on: boolean) => void;
}

/** The blooming flower in its 168px forest medal. */
function BloomMedal({ label }: { label: string }) {
  return (
    <div className="bloom flex h-[168px] w-[168px] items-center justify-center rounded-[84px] bg-forest">
      <svg width="130" height="130" viewBox="0 0 60 60" role="img" aria-label={label}>
        <path
          d="M30 56 V28"
          stroke="var(--stage-sprout-leaf)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path d="M30 46 C22 45 18 40 20 35 C27 35 30 40 30 46 Z" fill="var(--stage-sprout-leaf)" />
        <path d="M30 42 C38 41 42 36 40 31 C33 31 30 36 30 42 Z" fill="var(--stage-sprout)" />
        <circle cx="30" cy="12" r="7" fill="var(--stage-flower)" />
        <circle cx="39" cy="18" r="7" fill="var(--stage-flower)" />
        <circle cx="36" cy="28" r="7" fill="var(--stage-flower)" />
        <circle cx="24" cy="28" r="7" fill="var(--stage-flower)" />
        <circle cx="21" cy="18" r="7" fill="var(--stage-flower)" />
        <circle cx="30" cy="21" r="6" fill="var(--color-gold-light)" />
        <circle cx="10" cy="10" r="1.5" fill="var(--color-gold-light)" />
        <circle cx="52" cy="14" r="1.5" fill="var(--color-gold-light)" />
        <circle cx="48" cy="40" r="1.2" fill="var(--color-gold-light)" />
        <circle cx="8" cy="38" r="1.2" fill="var(--color-gold-light)" />
      </svg>
    </div>
  );
}

export function MissionCompleteScreen({
  closeHref,
  backHref,
  words,
  bloomed,
  stats,
  week,
  missions,
  reminder,
  onReminderChange,
}: MissionCompleteScreenProps) {
  const t = useTranslations('screens.complete');
  const f = useGardenFormat();
  const missionNames = useTranslations('screens.home.missions');
  const [remindOn, setRemindOn] = React.useState(reminder?.on ?? false);
  const dash = t('unknown');

  return (
    // Design system §10, A3: one centred column (max 560) on iPad portrait;
    // landscape puts bloom + stats on the left, next mission + reminder on
    // the right.
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-4 bg-bg px-4 pb-6 pt-5 text-text ipad-lg:max-w-[960px]">
      <div className="flex justify-end">
        <IconButton asChild aria-label={t('close')}>
          <Link href={closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
      </div>

      <div className="contents ipad-lg:grid ipad-lg:grid-cols-2 ipad-lg:items-start ipad-lg:gap-6">
        <div className="contents ipad-lg:flex ipad-lg:flex-col ipad-lg:gap-4">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <BloomMedal label={t('bloomLabel')} />
            <span className="mt-2 text-[12px] font-bold uppercase tracking-[0.1em] text-success">
              {t('overline')}
            </span>
            <h1 className="font-display text-[30px] font-semibold leading-[1.1]">
              {t('title', { count: words })}
            </h1>
            {bloomed ? (
              <span className="text-[15px] text-muted-foreground">
                {t('bloomed', { word: bloomed.word, count: bloomed.more })}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatTile
              value={
                stats.recalledPercent !== null ? t('percent', { value: stats.recalledPercent }) : dash
              }
              label={t('recalled')}
            />
            <StatTile
              value={stats.minutesToday !== null ? t('minutes', { count: stats.minutesToday }) : dash}
              label={t('today')}
            />
            <StatTile
              value={stats.streak !== null ? f.number(stats.streak) : dash}
              label={t('streak')}
              tone="success"
            />
          </div>

          {week ? (
            <WeekDots
              days={week.map(({ day, state }) => ({
                initial: f.weekdayInitial(day),
                label: t('dayLabel', {
                  day: f.weekday(day),
                  today: String(state === 'today'),
                  done: String(state !== 'empty'),
                }),
                state,
              }))}
            />
          ) : null}
        </div>

        <div className="contents ipad-lg:flex ipad-lg:flex-col ipad-lg:gap-4 ipad-lg:pt-14">
          {missions ? (
            <div className="flex flex-col gap-3 rounded-card border border-gold-border bg-gold-soft p-[14px]">
              <div className="flex items-center gap-3">
                <GoldenBloomIcon width={40} height={40} stemTo={23} />
                <div className="flex flex-grow flex-col">
                  <span className="text-[16px] font-bold">
                    {t('missionsDone', { done: missions.done, total: missions.total })}
                  </span>
                  <span className="text-[13px] text-gold-soft-text">
                    {t('missionsLeft', { count: missions.total - missions.done })}
                  </span>
                </div>
              </div>
              {missions.next ? (
                <Link
                  href={missions.next.href}
                  className={buttonClassName('primary', {
                    className: 'h-[54px] rounded-control text-[16px] md:max-w-none',
                  })}
                >
                  {missions.next.minutes === null
                    ? missionNames(missions.next.mission, { count: missions.next.count ?? 0 })
                    : t('nextMission', {
                        title: missionNames(missions.next.mission, {
                          count: missions.next.count ?? 0,
                        }),
                        minutes: missions.next.minutes,
                      })}
                </Link>
              ) : null}
            </div>
          ) : null}

          {reminder ? (
            <div className="flex items-center gap-3 rounded-[18px] border border-border bg-surface px-[14px] py-3">
              <BellIcon width={22} height={22} stroke="var(--color-forest)" />
              <div className="flex flex-grow flex-col">
                <span className="text-[14px] font-bold">
                  {t('ripening', { count: reminder.ripening })}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {t('remindAt', { time: f.clock(reminder.time) })}
                </span>
              </div>
              <Switch
                checked={remindOn}
                aria-label={t('remindAt', { time: f.clock(reminder.time) })}
                onCheckedChange={(on) => {
                  setRemindOn(on);
                  onReminderChange?.(on);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <Link
        href={backHref}
        className="mt-auto text-center text-[15px] font-semibold text-forest underline"
      >
        {t('back')}
      </Link>
    </div>
  );
}
