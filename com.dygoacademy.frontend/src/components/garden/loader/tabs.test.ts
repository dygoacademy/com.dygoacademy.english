import { describe, expect, it } from 'vitest';

import { hasTabBar, tabFor } from './tabs';

describe('tabFor / hasTabBar', () => {
  const table: [string, string | null][] = [
    ['/garden', 'garden'],
    ['/garden/', 'garden'],
    ['/garden?x=1', 'garden'],
    ['/missions', 'missions'],
    ['/topics', 'topics'],
    ['/topics/search', 'topics'],
    ['/topics/abc', 'topics'],
    ['/topics/abc/search', 'topics'],
    ['/groups', 'groups'],
    ['/groups/abc', 'groups'],
    ['/groups/abc/manage', 'groups'],
    ['/me', 'me'],
    ['/me/privacy', 'me'],
    // No tab bar:
    ['/review', null],
    ['/review/done', null],
    ['/quiz', null],
    ['/quiz?topic=abc', null],
    ['/sounds', null],
    ['/sounds/word', null],
    ['/join/abc', null],
    ['/welcome/level', null],
    ['/welcome/goal', null],
    ['/welcome/reminder', null],
    ['/welcome/ready', null],
    ['/garden/_gallery', null],
    ['/garden/_tokens', null],
    ['/login', null],
    ['/register', null],
    ['/', null],
    ['', null],
  ];

  it.each(table)('%s → %s', (path, tab) => {
    expect(tabFor(path)).toBe(tab);
    expect(hasTabBar(path)).toBe(tab !== null);
  });

  it('handles a missing path', () => {
    expect(tabFor(null)).toBeNull();
    expect(tabFor(undefined)).toBeNull();
  });
});
