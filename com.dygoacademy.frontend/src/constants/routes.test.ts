import { describe, expect, it } from 'vitest';

import { GARDEN_REFERENCE_PREFIX, GARDEN_ROUTES } from './garden';
import { isProtectedPath, legacyRedirect, PROTECTED_PATH_PREFIXES } from './routes';

describe('isProtectedPath', () => {
  it.each([
    '/',
    '/garden',
    '/review',
    '/review/done',
    '/topics',
    '/topics/x',
    '/missions',
    '/me',
    '/groups',
    '/groups/g1/manage',
    '/quiz',
    '/join/t',
    // Old garden paths are redirected first, but stay protected anyway.
    '/garden/me',
  ])('protects garden path %s', (path) => {
    expect(isProtectedPath(path)).toBe(true);
  });

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
    expect(isProtectedPath('/meadow')).toBe(false);
    expect(isProtectedPath('/reviews')).toBe(false);
    expect(isProtectedPath('/garden/_galleryx')).toBe(true);
  });

  it('lists every short URL', () => {
    expect(PROTECTED_PATH_PREFIXES).toEqual(
      expect.arrayContaining(['/', '/garden', '/review', '/topics', '/missions', '/me', '/groups', '/quiz', '/join']),
    );
  });

  it('leaves public paths alone', () => {
    for (const path of ['/login', '/register', '/search', '/searching', '/joined']) {
      expect(isProtectedPath(path)).toBe(false);
    }
  });
});

describe('legacyRedirect (UI-8 U8-5)', () => {
  it.each([
    ['/garden/review', '/review'],
    ['/garden/review/done', '/review/done'],
    ['/garden/topics', '/topics'],
    ['/garden/topics/t%201', '/topics/t%201'],
    ['/garden/missions', '/missions'],
    ['/garden/me', '/me'],
    ['/garden/groups', '/groups'],
    ['/garden/groups/g1/manage', '/groups/g1/manage'],
    ['/garden/quiz', '/quiz'],
    ['/garden/join/abc', '/join/abc'],
    ['/study', '/review'],
    ['/study/', '/review'],
    ['/analytics', '/me'],
    ['/settings', '/me'],
  ])('%s → %s', (from, to) => {
    expect(legacyRedirect(from)).toBe(to);
  });

  it.each([
    '/',
    '/garden',
    '/garden/',
    '/garden/_reference/A1-todays-garden',
    '/garden/_gallery',
    '/garden/_tokens',
    '/garden/unknown',
    '/review',
    '/topics/t1',
    '/join/abc',
    '/search',
    '/studying',
  ])('leaves %s alone', (path) => {
    expect(legacyRedirect(path)).toBeNull();
  });

  it('points every moved screen at its GARDEN_ROUTES path', () => {
    expect(legacyRedirect('/garden/review')).toBe(GARDEN_ROUTES.review);
    expect(legacyRedirect('/garden/topics')).toBe(GARDEN_ROUTES.topics);
    expect(legacyRedirect('/garden/missions')).toBe(GARDEN_ROUTES.missions);
    expect(legacyRedirect('/garden/me')).toBe(GARDEN_ROUTES.me);
    expect(legacyRedirect('/garden/groups')).toBe(GARDEN_ROUTES.groups);
    expect(legacyRedirect('/garden/quiz')).toBe(GARDEN_ROUTES.quiz());
    expect(legacyRedirect('/garden/join/t')).toBe(GARDEN_ROUTES.join('t'));
  });
});
