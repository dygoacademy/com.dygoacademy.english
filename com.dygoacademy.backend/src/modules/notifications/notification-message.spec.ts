import { buildReminderPayload } from './notification-message';

describe('buildReminderPayload', () => {
  it('returns null when nothing is due and there are no leeches', () => {
    expect(buildReminderPayload({ dueNow: 0, leechCount: 0, currentStreakDays: 5 })).toBeNull();
  });

  it('prioritizes a leech drill over streak protection or a plain habit nudge', () => {
    const result = buildReminderPayload({ dueNow: 10, leechCount: 3, currentStreakDays: 7 });
    expect(result?.tag).toBe('leech');
    expect(result?.path).toBe('/quiz?mode=leech');
    expect(result?.body).toContain('3 words');
  });

  it('singular phrasing for exactly one leech', () => {
    const result = buildReminderPayload({ dueNow: 1, leechCount: 1, currentStreakDays: 0 });
    expect(result?.body).toContain('1 word ');
  });

  it('streak protection outranks a plain habit nudge when both apply', () => {
    const result = buildReminderPayload({ dueNow: 4, leechCount: 0, currentStreakDays: 12 });
    expect(result?.tag).toBe('streak');
    expect(result?.path).toBe('/study');
    expect(result?.title).toContain('12-day streak');
  });

  it('falls back to a plain habit nudge with no streak and no leeches', () => {
    const result = buildReminderPayload({ dueNow: 2, leechCount: 0, currentStreakDays: 0 });
    expect(result?.tag).toBe('habit');
    expect(result?.path).toBe('/study');
  });

  it('a zero-day streak does not trigger streak-protection phrasing', () => {
    const result = buildReminderPayload({ dueNow: 6, leechCount: 0, currentStreakDays: 0 });
    expect(result?.tag).not.toBe('streak');
  });
});
