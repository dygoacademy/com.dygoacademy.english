'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ReminderChannel } from '@/types';

import { gcn } from '../cn';
import { BackIcon, BellIcon } from '../icons';
import { IconButton } from '../IconButton';
import { Switch } from '../Switch';
import { SCREEN_CLASSES } from './GardenTabBar';

/**
 * A8c · Reminder (canvas `reference/A8c-reminder*`, approved 2026-11-14).
 *
 * One ripening reminder: the main switch, then (while on) the sky with the
 * time, three presets (7:30 / 12:30 / 21:00), Smart time, the days and the
 * channels. Zalo and Email say "Soon" and are disabled: push is the only
 * sender. Off shows only the main switch and the gold note. Each change
 * saves at once (the board has no Save button).
 *
 * Props only (`live/ReminderLive` saves). Times are 24-hour without a
 * leading zero in every language ("7:30", "21:00"), as on the board.
 */
export interface ReminderScreenProps {
  backHref: string;
  on: boolean;
  /** Minutes after midnight, local. */
  minutes: number;
  smart: boolean;
  /** ISO weekdays, 1 = Monday … 7 = Sunday. */
  days: readonly number[];
  channels: readonly ReminderChannel[];
  onToggle: (on: boolean) => void;
  onTime: (minutes: number) => void;
  onSmart: (smart: boolean) => void;
  onDays: (days: number[]) => void;
  onChannel: (channel: ReminderChannel, on: boolean) => void;
  /** Why this browser can't get reminders; shown in place of the off note. */
  blocked?: string | null;
  busy?: boolean;
  error?: boolean;
  framed?: boolean;
}

export const REMINDER_PRESETS = [
  ['morning', 7 * 60 + 30],
  ['lunch', 12 * 60 + 30],
  ['evening', 21 * 60],
] as const;

const WEEK = [1, 2, 3, 4, 5, 6, 7] as const;

/** "7:30", "21:00". */
export function reminderClock(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The sun on the board's arc (viewBox 300 × 150): 6:00 left, 22:00 right. */
export function reminderSky(minutes: number) {
  const hh = minutes / 60;
  const a = Math.PI * (1 - (hh - 6) / 16);
  const x = Math.round(150 + 128 * Math.cos(a));
  const y = Math.round(140 - 120 * Math.sin(a));
  const night = hh >= 19;
  return {
    left: `${x / 3}%`,
    top: `${y / 1.5}%`,
    night,
    sky: night
      ? 'var(--reminder-sky-night)'
      : hh < 10
        ? 'var(--reminder-sky-dawn)'
        : 'var(--reminder-sky-day)',
  };
}

const PILL =
  'h-[38px] whitespace-nowrap rounded-[19px] border px-[14px] text-[13px] font-bold';
const PICKED = 'border-forest bg-forest text-white';
const SOON_SWITCH = 'disabled:cursor-not-allowed disabled:bg-border disabled:opacity-60';

export function ReminderScreen({
  backHref,
  on,
  minutes,
  smart,
  days,
  channels,
  onToggle,
  onTime,
  onSmart,
  onDays,
  onChannel,
  blocked = null,
  busy = false,
  error = false,
  framed = false,
}: ReminderScreenProps) {
  const t = useTranslations('screens.reminder');
  const sky = reminderSky(minutes);
  const daysId = React.useId();

  return (
    <div
      className={gcn(
        SCREEN_CLASSES,
        'relative gap-3 px-4 pb-6 pt-5',
        framed && 'h-[844px] min-h-0 overflow-hidden',
      )}
    >
      <header className="flex items-center gap-3">
        <IconButton asChild aria-label={t('back')}>
          <Link href={backHref}>
            <BackIcon width={20} height={20} />
          </Link>
        </IconButton>
        <h1 className="flex-grow font-display text-[24px] font-semibold leading-[1.15]">
          {t('title')}
        </h1>
      </header>

      <div className="flex items-center gap-3 rounded-[18px] border border-border bg-surface px-[14px] py-2.5">
        {/* The board draws the icon inline: a 26px line box, icon at its top. */}
        <span className="h-[26px] text-forest">
          <BellIcon width={22} height={22} />
        </span>
        <span className="flex flex-grow flex-col">
          <span className="text-[15px] font-bold">{t('main.title')}</span>
          <span className="text-[12px] text-muted-foreground">{t('main.body')}</span>
        </span>
        <Switch
          size="sm"
          checked={on}
          disabled={busy}
          aria-label={t('main.title')}
          onCheckedChange={onToggle}
        />
      </div>

      {on ? (
        <>
          <div
            aria-hidden="true"
            className="relative h-32 overflow-hidden rounded-[22px] transition-[background] duration-[.4s]"
            style={{ background: sky.sky }}
          >
            <svg
              width="100%"
              viewBox="0 0 300 150"
              className="absolute inset-0 block h-full"
            >
              <path
                d="M22 140 A128 120 0 0 1 278 140"
                fill="none"
                stroke="rgba(255,255,255,.55)"
                strokeWidth="2"
                strokeDasharray="3 6"
              />
              <rect x="0" y="138" width="300" height="12" fill="var(--color-forest-deep)" />
              <g transform="translate(40,96)">
                {[16, 8, 20, 4, 14, 10, 18, 6, 12].map((top, i) => (
                  <React.Fragment key={i}>
                    <rect
                      x={i * 26}
                      y={top}
                      width="3"
                      height={30 - top}
                      fill="var(--stage-tree-canopy)"
                    />
                    <circle cx={i * 26 + 1.5} cy={top} r="4" fill="var(--stage-sprout-leaf)" />
                  </React.Fragment>
                ))}
              </g>
            </svg>
            <span
              className="absolute -ml-[17px] -mt-[17px] h-[34px] w-[34px] rounded-[17px] transition-all duration-[.4s]"
              style={{
                left: sky.left,
                top: sky.top,
                background: sky.night ? 'var(--color-gold-light)' : 'var(--stage-tree-fruit)',
                boxShadow: sky.night
                  ? '0 0 0 8px rgba(242,210,139,.18)'
                  : '0 0 0 8px rgba(224,176,74,.22)',
              }}
            />
            <span
              className={gcn(
                'absolute right-[14px] top-3 font-display text-[30px] font-semibold',
                sky.night ? 'text-on-forest' : 'text-forest',
              )}
            >
              {smart ? t('smart.sky') : reminderClock(minutes)}
            </span>
          </div>

          <div className="flex gap-1.5">
            {REMINDER_PRESETS.map(([key, value]) => {
              // As on the board: Smart time keeps the saved time picked (its fallback).
              const picked = minutes === value;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={picked}
                  disabled={busy}
                  onClick={() => onTime(value)}
                  className={gcn(
                    PILL,
                    picked ? PICKED : 'border-border bg-surface text-text',
                  )}
                >
                  {t(`preset.${key}`, { time: reminderClock(value) })}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="flex flex-grow flex-col">
              <span className="text-[14px] font-semibold">{t('smart.title')}</span>
              <span className="text-[12px] text-muted-foreground">{t('smart.body')}</span>
            </span>
            <Switch
              size="sm"
              checked={smart}
              disabled={busy}
              aria-label={t('smart.title')}
              onCheckedChange={onSmart}
            />
          </div>

          <div role="group" aria-labelledby={daysId} className="grid grid-cols-7 gap-1.5">
            <span id={daysId} className="sr-only">
              {t('daysLabel')}
            </span>
            {WEEK.map((day) => {
              const picked = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={picked}
                  aria-label={t(`dayNames.${day}`)}
                  disabled={busy}
                  onClick={() => {
                    // Keep at least one day: no day at all is what the main switch is for.
                    if (picked && days.length === 1) return;
                    onDays(
                      picked ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b),
                    );
                  }}
                  className={gcn(
                    'h-10 rounded-[20px] border p-0 text-[13px] font-bold',
                    picked ? PICKED : 'border-border bg-surface text-muted-foreground',
                  )}
                >
                  {t(`days.${day}`)}
                </button>
              );
            })}
          </div>

          <div className="rounded-[18px] border border-border bg-surface px-[14px]">
            <div className="flex h-[34px] items-center">
              <h2 className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                {t('channelsTitle')}
              </h2>
            </div>
            {(['push', 'zalo', 'email'] as const).map((channel) => {
              const live = channel === 'push';
              const label = t(`channel.${channel}`);
              return (
                <div
                  key={channel}
                  className="box-content flex h-[46px] items-center gap-3 border-t border-divider"
                >
                  <span
                    className={gcn(
                      'flex-grow text-[15px] font-semibold',
                      live ? 'text-text' : 'text-text-faint',
                    )}
                  >
                    {label}
                  </span>
                  {live ? (
                    <Switch
                      size="sm"
                      checked={channels.includes('push')}
                      disabled={busy}
                      aria-label={label}
                      onCheckedChange={(next) => onChannel('push', next)}
                    />
                  ) : (
                    <>
                      <span
                        aria-hidden="true"
                        className="rounded-[10px] bg-divider px-2.5 py-1 text-[12px] font-bold text-muted-foreground"
                      >
                        {t('soon')}
                      </span>
                      <Switch
                        size="sm"
                        checked={false}
                        disabled
                        aria-label={t('soonLabel', { channel: label })}
                        className={SOON_SWITCH}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <p className="m-0 text-center text-[12px] text-muted-foreground">{t('quiet')}</p>
        </>
      ) : (
        <div className="rise rounded-[18px] border border-gold-border bg-gold-soft p-[14px] text-[14px] leading-[1.45] text-gold-soft-text">
          {blocked ?? t('off')}
        </div>
      )}

      <div role="status" aria-live="polite" className="mt-auto">
        {error ? (
          <div className="rounded-[14px] bg-text px-[14px] py-3 text-[14px] text-white">
            {t('error')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
