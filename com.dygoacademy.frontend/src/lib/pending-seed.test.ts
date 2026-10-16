import { beforeEach, describe, expect, it } from 'vitest';

import { PENDING_SEED_KEY, cleanSeed, keepPendingSeed, takePendingSeed } from './pending-seed';

describe('pending seed (landing page "Save this word")', () => {
  beforeEach(() => window.localStorage.clear());

  it('cleans the word: trimmed, single spaces, needs a letter, not too long', () => {
    expect(cleanSeed('  take   off ')).toBe('take off');
    expect(cleanSeed('mỉm cười')).toBe('mỉm cười');
    expect(cleanSeed('')).toBeNull();
    expect(cleanSeed('1234')).toBeNull();
    expect(cleanSeed('a'.repeat(61))).toBeNull();
    expect(cleanSeed(null)).toBeNull();
  });

  it('keeps a word until it is taken, once', () => {
    keepPendingSeed(' resilient ');
    expect(window.localStorage.getItem(PENDING_SEED_KEY)).toBe('resilient');
    expect(takePendingSeed()).toBe('resilient');
    expect(takePendingSeed()).toBeNull();
  });

  it('keeps nothing for an unusable word', () => {
    keepPendingSeed('   ');
    expect(takePendingSeed()).toBeNull();
  });
});
