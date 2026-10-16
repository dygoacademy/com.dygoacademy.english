import { buildReminderPayload } from './notification-message';

describe('buildReminderPayload', () => {
  it('nudges a learner with nothing due who has not studied today', () => {
    const result = buildReminderPayload({ dueNow: 0, leechCount: 0, currentStreakDays: 5 });
    expect(result?.tag).toBe('nudge');
    expect(result?.path).toBe('/garden');
  });

  it('returns null when nothing is due and the learner already studied today', () => {
    expect(
      buildReminderPayload({ dueNow: 0, leechCount: 0, currentStreakDays: 5, studiedToday: true }),
    ).toBeNull();
  });

  it('still sends due words to a learner who studied today', () => {
    const result = buildReminderPayload({
      dueNow: 3,
      leechCount: 0,
      currentStreakDays: 0,
      studiedToday: true,
    });
    expect(result?.tag).toBe('habit');
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
    expect(result?.path).toBe('/review');
    expect(result?.title).toContain('12-day streak');
  });

  it('falls back to a plain habit nudge with no streak and no leeches', () => {
    const result = buildReminderPayload({ dueNow: 2, leechCount: 0, currentStreakDays: 0 });
    expect(result?.tag).toBe('habit');
    expect(result?.path).toBe('/review');
    expect(result?.body).toBe('2 words are ready to review.');
  });

  it('a zero-day streak does not trigger streak-protection phrasing', () => {
    const result = buildReminderPayload({ dueNow: 6, leechCount: 0, currentStreakDays: 0 });
    expect(result?.tag).not.toBe('streak');
  });

  it('speaks the learner’s app language', () => {
    expect(
      buildReminderPayload({ dueNow: 2, leechCount: 0, currentStreakDays: 0, locale: 'vi-VN' }),
    ).toMatchObject({
      title: 'Đến giờ tưới vườn rồi',
      body: '2 từ đã sẵn sàng để ôn.',
    });
    expect(
      buildReminderPayload({ dueNow: 0, leechCount: 0, currentStreakDays: 0, locale: 'zh-CN' })
        ?.title,
    ).toBe('你的花园在等你');
    expect(
      buildReminderPayload({ dueNow: 0, leechCount: 0, currentStreakDays: 0, locale: 'en-SG' })
        ?.title,
    ).toBe('Your garden is waiting');
  });
});
