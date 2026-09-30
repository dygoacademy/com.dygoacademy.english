import { describe, expect, it } from 'vitest';

import { GARDEN_REFERENCE_PREFIX, GARDEN_ROUTES } from './garden';
import { isProtectedPath, PROTECTED_PATH_PREFIXES } from './routes';

describe('isProtectedPath', () => {
  it.each(['/garden', '/garden/topics/x', '/garden/join/t', '/garden/me', '/garden/review/done'])(
    'protects garden path %s',
    (path) => {
      expect(isProtectedPath(path)).toBe(true);
    },
  );

  it.each([
    '/garden/_reference/A1-todays-garden',
    GARDEN_REFERENCE_PREFIX,
    '/garden/_gallery',
    '/garden/_tokens',
    GARDEN_ROUTES.gallery,
    GARDEN_ROUTES.tokens,
  ])('keeps the garden dev page %s public', (path) => {
    expect(isProtectedPath(path)).toBe(false);
  });

  it('does not match a path that only shares the text prefix', () => {
    expect(isProtectedPath('/gardening')).toBe(false);
    expect(isProtectedPath('/garden/_galleryx')).toBe(true);
  });

  it('keeps the existing protected entries', () => {
    expect(PROTECTED_PATH_PREFIXES).toEqual(
      expect.arrayContaining([
        '/',
        '/topics',
        '/study',
        '/quiz',
        '/analytics',
        '/settings',
        '/groups',
        '/join',
      ]),
    );
    const paths = [
      '/',
      '/topics',
      '/topics/abc',
      '/study',
      '/quiz',
      '/analytics',
      '/settings',
      '/groups/g1',
      '/join/tok',
    ];
    for (const path of paths) {
      expect(isProtectedPath(path)).toBe(true);
    }
  });

  it('leaves public paths alone', () => {
    for (const path of ['/login', '/register', '/search', '/searching', '/joined']) {
      expect(isProtectedPath(path)).toBe(false);
    }
  });
});
