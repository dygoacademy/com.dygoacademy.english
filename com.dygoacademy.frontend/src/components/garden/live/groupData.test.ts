import { describe, expect, it } from 'vitest';

import {
  avatarRow,
  bedPlant,
  bedShares,
  displayLink,
  gardenerName,
  gardenPlant,
  inviteUrl,
  tokenFromLink,
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
