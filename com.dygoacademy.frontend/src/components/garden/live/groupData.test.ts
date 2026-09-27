import { describe, expect, it } from 'vitest';

import {
  avatarRow,
  bedPlant,
  bedShares,
  displayLink,
  firstRainDay,
  gardenerName,
  gardenPlant,
  inviteUrl,
  rainDayEnds,
  tokenFromLink,
  wettestBed,
} from './groupData';

const member = (id: string, display: string | null, email: string | null = null) => ({
  user_id: id,
  role: 'READ' as const,
  joined_at: '2026-09-02T00:00:00Z',
  display_name: display,
  email,
});

describe('group live data', () => {
  it('names a gardener by display name, then email, then id', () => {
    expect(gardenerName(member('u1', 'Linh Tran'))).toBe('Linh Tran');
    expect(gardenerName(member('u2', ' ', 'tom@dygo.test'))).toBe('tom');
    expect(gardenerName(member('abcdef123456', null))).toBe('abcdef12');
  });

  it('shows up to four initials and "+N" for the rest of the real total', () => {
    const roster = [member('u1', 'Minh'), member('u2', 'Linh')];
    expect(avatarRow(roster, 5, { withMore: true }).map((a) => a.text)).toEqual(['M', 'L', '+3']);
    expect(avatarRow(roster, 5).map((a) => a.text)).toEqual(['M', 'L']);
    expect(avatarRow(roster, 2, { withMore: true })).toHaveLength(2);
  });

  it('picks tile plants', () => {
    expect(gardenPlant(126)).toBe('tree');
    expect(gardenPlant(64)).toBe('flower');
    expect(gardenPlant(0)).toBe('sprout');
    expect(bedPlant({ tree_count: 19, flower_count: 7, sprout_count: 11, seed_count: 11 })).toBe('sprout');
    expect(bedPlant({ tree_count: 22, flower_count: 9, sprout_count: 5, seed_count: 4 })).toBe('tree');
    expect(bedPlant({ tree_count: 0, flower_count: 0, sprout_count: 0, seed_count: 0 })).toBe('sprout');
  });

  it('turns counts into bar shares', () => {
    expect(bedShares({ word_count: 48, tree_count: 18, flower_count: 7, sprout_count: 11 })).toEqual({
      tree: 38,
      flower: 15,
      sprout: 23,
    });
    expect(bedShares({ word_count: 0, tree_count: 0, flower_count: 0, sprout_count: 0 }).tree).toBe(0);
  });

  it('reads a token from a pasted link or a bare token', () => {
    expect(tokenFromLink('https://dygoacademy.com/join/7Hk2-qP9x_Lm4r')).toBe('7Hk2-qP9x_Lm4r');
    expect(tokenFromLink('dygoacademy.com/garden/join/abc')).toBe('abc');
    expect(tokenFromLink('AbCdEfGhIjKlMnOpQrStUvWx')).toBe('AbCdEfGhIjKlMnOpQrStUvWx');
    expect(tokenFromLink('hello')).toBeNull();
    expect(tokenFromLink('')).toBeNull();
  });

  it('shares the classic /join link and shows it without the scheme', () => {
    const url = inviteUrl('https://dygoacademy.com/', 'tok');
    expect(url).toBe('https://dygoacademy.com/join/tok');
    expect(displayLink(url)).toBe('dygoacademy.com/join/tok');
  });
});

describe('rain days (UI-G RD-4)', () => {
  it('waters the bed with the most due words, first on a tie, none when nothing is due', () => {
    const bed = (topic_id: string, due_count: number) => ({ topic_id, due_count });
    expect(wettestBed([bed('a', 2), bed('b', 5), bed('c', 5)])).toBe('b');
    expect(wettestBed([bed('a', 0), bed('b', 0)])).toBeNull();
    expect(wettestBed([])).toBeNull();
  });

  it('shows the first garden in list order with a running rain day', () => {
    const rain = { wordsPerGardener: 10, gardeners: 5, done: 3, mine: 4, endsAt: '2026-09-27T16:00:00Z' };
    const counts = [
      { group_id: 'b', rainDay: rain },
      { group_id: 'a', rainDay: null },
      { group_id: 'c', rainDay: { ...rain, done: 1 } },
    ];
    expect(firstRainDay(['a', 'c', 'b'], counts)).toEqual({ groupId: 'c', rainDay: { ...rain, done: 1 } });
    expect(firstRainDay(['a'], counts)).toBeNull();
    expect(firstRainDay(['a', 'b'], [{ group_id: 'a' }, { group_id: 'b' }])).toBeNull();
  });

  it("ends at 23:59 of the admin's day, shown in the viewer's zone", () => {
    // Next midnight in Singapore (UTC+8) = 16:00 UTC.
    expect(rainDayEnds('2026-09-27T16:00:00Z', 'Asia/Singapore')).toEqual({ hour: 23, minute: 59 });
    // The same moment for a viewer in Ho Chi Minh City (UTC+7).
    expect(rainDayEnds('2026-09-27T16:00:00Z', 'Asia/Ho_Chi_Minh')).toEqual({ hour: 22, minute: 59 });
    expect(rainDayEnds('2026-09-28T00:00:00.000Z', 'UTC')).toEqual({ hour: 23, minute: 59 });
  });
});
