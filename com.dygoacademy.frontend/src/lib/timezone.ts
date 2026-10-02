/**
 * The one place in the app that resolves "what timezone is this session
 * in." Everything date-bounded (the classic learning path's ribbon, useSrsStats'
 * streak, useDailyActivity/useUpcomingActivity's day grouping) should
 * call this instead of touching `Intl`/the platform directly — added
 * 2026-09-21 after the ribbon showed the wrong "Today" for a UTC+8 user
 * in the early hours of their local day (the classic learning path was building
 * its 5-row window from UTC calendar dates, and the backend's day
 * grouping in `srs.service.ts` was doing the same).
 *
 * Resolution order: an explicit user-set preference (not yet built — no
 * Settings UI exists for this; profiles.timezone is readable/writable
 * server-side but nothing lets a user override it yet) -> the browser's
 * detected IANA zone -> a fixed default matching Dygo's core Vietnamese
 * market. Structured with the user-preference tier as a no-op today so
 * that landing one later (Settings screen, onboarding line) means
 * filling in one branch here rather than touching every call site.
 *
 * The resolved value is also sent to the backend (as a `tz` query param
 * on the day-bounded endpoints) so the frontend's "today" and the
 * backend's day-grouping queries agree on the same calendar — resolving
 * it correctly on only one side would just move the mismatch instead of
 * fixing it.
 */

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

let cached: string | null = null;

function detectTimezone(): string | null {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return detected || null;
  } catch {
    return null;
  }
}

/**
 * Resolved IANA timezone for this session. Cached per page load — the
 * device's zone doesn't change mid-session in any way this app needs to
 * react to live (a genuine change, e.g. travel, is picked up on next load).
 */
export function getResolvedTimezone(): string {
  if (cached) return cached;
  cached = detectTimezone() ?? DEFAULT_TIMEZONE;
  return cached;
}

/** Formats `date` as a YYYY-MM-DD calendar-day string in the given IANA zone. */
export function toLocalDateString(date: Date, timeZone: string = getResolvedTimezone()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Shifts a YYYY-MM-DD calendar-day string by `deltaDays` whole days.
 * Anchors at UTC noon (not midnight) so the UTC-side arithmetic never
 * crosses a DST boundary within the same UTC calendar day the way
 * midnight can — the input/output are pure calendar dates, no time-of-day
 * or zone information carried through.
 */
export function addDays(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** Short weekday label ("Mon") for a YYYY-MM-DD calendar-day string. */
export function weekdayLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    timeZone: 'UTC',
  });
}
