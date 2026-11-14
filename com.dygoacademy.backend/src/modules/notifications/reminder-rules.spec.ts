import {
  isCandidate,
  isQuietTime,
  isReminderDay,
  liveChannels,
  pickSmartHour,
  shouldSend,
  type ReminderSlot,
} from './reminder-rules';

const at = (h: number, m = 0) => h * 60 + m;
const slot = (over: Partial<ReminderSlot> = {}): ReminderSlot => ({
  nowMinute: at(7, 30),
  savedMinute: at(7, 30),
  isoDow: 1,
  days: [1, 2, 3, 4, 5, 6],
  channels: ['push'],
  smart: false,
  ...over,
});

describe('reminder rules (A8c)', () => {
  it('quiet hours are 22:00 to 07:00', () => {
    expect(isQuietTime(at(21, 59))).toBe(false);
    expect(isQuietTime(at(22, 0))).toBe(true);
    expect(isQuietTime(at(3, 0))).toBe(true);
    expect(isQuietTime(at(6, 59))).toBe(true);
    expect(isQuietTime(at(7, 0))).toBe(false);
  });

  it('days are ISO weekdays', () => {
    expect(isReminderDay([1, 2, 3, 4, 5, 6], 6)).toBe(true);
    expect(isReminderDay([1, 2, 3, 4, 5, 6], 7)).toBe(false);
    expect(isReminderDay([], 1)).toBe(false);
  });

  it('only push is live; Zalo and Email are saved, not sent', () => {
    expect(liveChannels(['push', 'zalo', 'email'])).toEqual(['push']);
    expect(liveChannels(['email'])).toEqual([]);
  });

  describe('pickSmartHour', () => {
    it('picks the hour with the most words ripening', () => {
      expect(pickSmartHour([9, 14, 14, 18])).toBe(14);
    });
    it('counts words ripening overnight for 07:00, and drops 22:00 onwards', () => {
      expect(pickSmartHour([1, 3, 5, 14, 22, 23, 23, 23])).toBe(7);
    });
    it('ties go to the earlier hour', () => {
      expect(pickSmartHour([18, 9, 18, 9])).toBe(9);
    });
    it('is null when nothing ripens today (use the saved time)', () => {
      expect(pickSmartHour([])).toBeNull();
      expect(pickSmartHour([22, 23])).toBeNull();
      expect(pickSmartHour([Number.NaN])).toBeNull();
    });
  });

  describe('shouldSend', () => {
    it('sends at the saved time on a ticked day', () => {
      expect(shouldSend(slot({ nowMinute: at(7, 40) }), null)).toBe(true);
      expect(shouldSend(slot({ nowMinute: at(7, 45) }), null)).toBe(false);
    });
    it('never on an unticked day', () => {
      expect(shouldSend(slot({ isoDow: 7 }), null)).toBe(false);
    });
    it('never in quiet hours', () => {
      expect(shouldSend(slot({ savedMinute: at(22, 30), nowMinute: at(22, 30) }), null)).toBe(
        false,
      );
    });
    it('never without a live channel', () => {
      expect(shouldSend(slot({ channels: ['zalo'] }), null)).toBe(false);
    });
    it('Smart: the first quarter of the picked hour, not the saved time', () => {
      const smart = { smart: true };
      expect(shouldSend(slot({ ...smart, nowMinute: at(14, 0) }), 14)).toBe(true);
      expect(shouldSend(slot({ ...smart, nowMinute: at(14, 15) }), 14)).toBe(false);
      expect(shouldSend(slot({ ...smart, nowMinute: at(7, 30) }), 14)).toBe(false);
    });
    it('Smart with nothing ripening falls back to the saved time', () => {
      expect(shouldSend(slot({ smart: true }), null)).toBe(true);
    });
    it('Smart only works out the hour on candidate ticks', () => {
      expect(isCandidate(slot({ smart: true, nowMinute: at(13, 20) }))).toBe(false);
      expect(isCandidate(slot({ smart: true, nowMinute: at(13, 5) }))).toBe(true);
    });
  });
});
