import { describe, expect, it } from 'vitest';

import {
  calendarDay,
  formatClock,
  hourIn,
  isoDay,
  parseClock,
  todayIn,
  weekDays,
} from './format';

describe('formatClock', () => {
  it('writes English times with an upper-case day period (canvas: "7:30 AM")', () => {
    expect(formatClock({ hour: 7, minute: 30 }, 'en-US')).toBe('7:30\u00a0AM');
    expect(formatClock({ hour: 19, minute: 5 }, 'en-US')).toBe('7:05\u00a0PM');
  });
  it('uses the 24-hour clock in Vietnamese and Chinese', () => {
    expect(formatClock({ hour: 7, minute: 30 }, 'vi-VN')).toBe('7:30');
    expect(formatClock({ hour: 19, minute: 30 }, 'vi-VN')).toBe('19:30');
    expect(formatClock({ hour: 19, minute: 30 }, 'zh-CN')).toBe('19:30');
  });
  it('parses reminder_time columns', () => {
    expect(parseClock('07:30:00')).toEqual({ hour: 7, minute: 30 });
  });
});

describe('calendar days', () => {
  it('is the learner’s date in their zone, whatever the machine zone', () => {
    const instant = new Date('2026-09-25T20:00:00Z');
    expect(isoDay(todayIn('Asia/Singapore', instant))).toBe('2026-09-26');
    expect(isoDay(todayIn('America/New_York', instant))).toBe('2026-09-25');
    expect(hourIn('Asia/Ho_Chi_Minh', instant)).toBe(3);
  });
  it('lists the week from the locale’s first day', () => {
    const friday = calendarDay(2026, 9, 25);
    expect(weekDays(friday, 1).map(isoDay)).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
    expect(isoDay(weekDays(friday, 0)[0])).toBe('2026-09-20');
    expect(isoDay(weekDays(calendarDay(2026, 9, 27), 1)[0])).toBe('2026-09-21');
  });
});
