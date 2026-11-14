/**
 * A8c Reminder rules (Adult · Profile, approved 2026-11-14). Pure, so the
 * worker's decisions are unit tested without a database or a clock.
 *
 * - Quiet hours are fixed: no reminder from 22:00 until 07:00 local time.
 * - `days` are ISO weekdays (1 = Monday … 7 = Sunday); A8c's default is
 *   Monday to Saturday.
 * - Only channels with a sender are sent through; today that is push.
 *   Zalo and Email are saved (A8c shows them as "Soon") and skipped.
 * - Smart time: the hour, outside quiet hours, in which the most of the
 *   learner's words ripen today. Words that ripen during the night count
 *   for 07:00 (they are waiting when quiet hours end); words that ripen
 *   from 22:00 belong to tomorrow. With nothing ripening today, the saved
 *   time is used.
 */

export const QUIET_HOURS = { start: 22, end: 7 } as const;

export const REMINDER_DAYS_DEFAULT = [1, 2, 3, 4, 5, 6] as const;

export const REMINDER_CHANNELS = ['push', 'zalo', 'email'] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

/** Channels that have a sender in this backend. */
export const LIVE_CHANNELS: readonly ReminderChannel[] = ['push'];

/** The 15-minute tick: which quarter of the local day a time falls in. */
export const TICK_MINUTES = 15;

/** True for a local time (minutes since midnight) inside quiet hours. */
export function isQuietTime(minuteOfDay: number): boolean {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  return hour >= QUIET_HOURS.start || hour < QUIET_HOURS.end;
}

/** True when `isoDow` (1–7) is one of the reminder's days. */
export function isReminderDay(days: readonly number[], isoDow: number): boolean {
  return days.includes(isoDow);
}

/** The live channels to send through; empty means send nothing. */
export function liveChannels(channels: readonly string[]): ReminderChannel[] {
  return LIVE_CHANNELS.filter((c) => channels.includes(c));
}

/**
 * The Smart time hour for today, or null when nothing ripens today (use
 * the saved time). `ripeningHours` = the local hour (0–23) in which each of
 * today's words becomes due. Ties go to the earlier hour.
 */
export function pickSmartHour(ripeningHours: readonly number[]): number | null {
  const counts = new Map<number, number>();
  for (const h of ripeningHours) {
    if (!Number.isInteger(h) || h < 0 || h >= QUIET_HOURS.start) continue;
    const hour = Math.max(h, QUIET_HOURS.end);
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  let best: number | null = null;
  for (const [hour, n] of counts) {
    const top = best === null ? 0 : counts.get(best)!;
    if (n > top || (n === top && best !== null && hour < best)) best = hour;
  }
  return best;
}

export interface ReminderSlot {
  /** Local minutes since midnight at this tick. */
  nowMinute: number;
  /** The saved reminder time, local minutes since midnight. */
  savedMinute: number;
  isoDow: number;
  days: readonly number[];
  channels: readonly string[];
  smart: boolean;
}

const quarter = (minute: number) => Math.floor(minute / TICK_MINUTES);

/**
 * Whether this tick may be the reminder's moment, before Smart time is
 * worked out: right day, a live channel, outside quiet hours, and either
 * the saved time's quarter or (Smart) the first quarter of an hour.
 */
export function isCandidate(slot: ReminderSlot): boolean {
  if (!isReminderDay(slot.days, slot.isoDow)) return false;
  if (liveChannels(slot.channels).length === 0) return false;
  if (isQuietTime(slot.nowMinute)) return false;
  const atSaved = quarter(slot.nowMinute) === quarter(slot.savedMinute);
  if (!slot.smart) return atSaved;
  return atSaved || slot.nowMinute % 60 < TICK_MINUTES;
}

/**
 * The final decision for a candidate. Not Smart: send (it is the saved
 * time). Smart: send in the first quarter of the picked hour, or at the
 * saved time when nothing ripens today.
 */
export function shouldSend(slot: ReminderSlot, smartHour: number | null): boolean {
  if (!isCandidate(slot)) return false;
  const atSaved = quarter(slot.nowMinute) === quarter(slot.savedMinute);
  if (!slot.smart || smartHour === null) return atSaved;
  return slot.nowMinute % 60 < TICK_MINUTES && Math.floor(slot.nowMinute / 60) === smartHour;
}
