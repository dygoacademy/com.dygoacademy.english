import { describe, expect, it } from 'vitest';

import { findMatch, fold, splitMatch } from './fold';

describe('search folding', () => {
  it('ignores case and Vietnamese accents', () => {
    expect(fold('Giảm NHẸ')).toBe('giam nhe');
    expect(fold('Đất')).toBe('dat');
    expect(findMatch('xấu đi, suy giảm', 'giam')).toEqual([12, 16]);
    expect(findMatch('xấu đi, suy giảm', 'GIẢM')).toEqual([12, 16]);
  });

  it('maps the match back to the original text', () => {
    expect(splitMatch('Deteriorate', 'de')).toEqual(['', 'De', 'teriorate']);
    expect(splitMatch('suy giảm', 'giam')).toEqual(['suy ', 'giảm', '']);
    expect(splitMatch('drought', 'xyz')).toBeNull();
    expect(splitMatch('drought', '  ')).toBeNull();
  });
});
