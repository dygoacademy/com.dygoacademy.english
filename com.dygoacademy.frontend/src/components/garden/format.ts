import * as React from 'react';
import { useFormatter, useLocale, useTimeZone } from 'next-intl';

import { appLocaleOf, shortWeekdayStyle, weekStartsOn } from '@/i18n/config';

/**
 * Locale formatting for garden screens (UI-L). Every date, time, weekday
 * and number a screen shows goes through here or through ICU arguments in
 * the messages; nothing is concatenated or pre-formatted by the caller.
 *
 * Two kinds of date:
 * - **Calendar days** ("Friday, 25 September", weekday initials): a
 *   `Date` at 12:00 UTC of that day (`calendarDay`). They're always
 *   formatted in UTC, so the day never shifts with the viewer's zone. Use
 *   `todayIn(timeZone)` for the learner's today.
 * - **Clock times** ("7:30 AM", "7:30"): a wall-clock `{ hour, minute }`,
 *   like a reminder time, formatted in the language's 12/24-hour style.
 */
export interface ClockTime {
  hour: number;
  minute: number;
}

/** 12:00 UTC on the given calendar day (month is 1-based). */
export function calendarDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** The learner's calendar day in `timeZone`, as a calendar-day Date. */
export function todayIn(timeZone: string | undefined, now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return calendarDay(get('year'), get('month'), get('day'));
}

/** The hour (0–23) in `timeZone`. */
export function hourIn(timeZone: string | undefined, now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(now);
  return Number(hour) % 24;
}

/** YYYY-MM-DD of a calendar day. */
export function isoDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}

export function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * 86_400_000);
}

/** The seven calendar days of the week containing `day`, from `firstDay` (0 = Sunday). */
export function weekDays(day: Date, firstDay: 0 | 1): Date[] {
  const offset = (day.getUTCDay() - firstDay + 7) % 7;
  const start = addDays(day, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * "7:30 AM" / "7:30" in the locale's clock. English day periods are
 * upper case, as in the canvas (en-SG's CLDR data says "am").
 */
export function formatClock(time: ClockTime, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).formatToParts(new Date(Date.UTC(2000, 0, 1, time.hour, time.minute)));
  const upper = appLocaleOf(locale) === 'en';
  return (
    parts
      .map((part) => (part.type === 'dayPeriod' && upper ? part.value.toUpperCase() : part.value))
      .join('')
      // CLDR puts a narrow no-break space before "AM"; the canvas has a normal-width one.
      .replace(/\u202f/g, '\u00a0')
  );
}

/** "07:30:00" (a reminder_time column) → { hour: 7, minute: 30 }. */
export function parseClock(hhmmss: string): ClockTime {
  const [hour, minute] = hhmmss.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

const UTC = { timeZone: 'UTC' } as const;

export function useGardenFormat() {
  const format = useFormatter();
  const locale = useLocale();
  const timeZone = useTimeZone();
  return React.useMemo(
    () => ({
      locale,
      timeZone,
      /** First day of the week for this locale (Sunday only for en-US). */
      weekStart: weekStartsOn(locale),
      number: (value: number) => format.number(value),
      /** "Friday, 25 September" · "Thứ Sáu, 25 tháng 9" · "9月25日星期五". */
      longDay: (day: Date) =>
        format.dateTime(day, { ...UTC, weekday: 'long', day: 'numeric', month: 'long' }),
      /** "21 September" · "21 tháng 9". */
      dayMonth: (day: Date) => format.dateTime(day, { ...UTC, day: 'numeric', month: 'long' }),
      /** "2 Sep" · "2/9" · "9月2日" (UI-G: joined, invite expiry). */
      shortDay: (day: Date) =>
        format.dateTime(
          day,
          locale.startsWith('vi')
            ? { ...UTC, day: 'numeric', month: 'numeric' }
            : { ...UTC, day: 'numeric', month: 'short' },
        ),
      /** "Sunday" · "Chủ Nhật". */
      weekday: (day: Date) => format.dateTime(day, { ...UTC, weekday: 'long' }),
      /** "M" · "T2" · "一". */
      weekdayInitial: (day: Date) => format.dateTime(day, { ...UTC, weekday: 'narrow' }),
      /** "Mon" · "T2" · "周一" (the A4 strip). */
      weekdayShort: (day: Date) =>
        format.dateTime(day, { ...UTC, weekday: shortWeekdayStyle(locale) }),
      clock: (time: ClockTime) => formatClock(time, locale),
    }),
    [format, locale, timeZone],
  );
}

export type GardenFormat = ReturnType<typeof useGardenFormat>;
