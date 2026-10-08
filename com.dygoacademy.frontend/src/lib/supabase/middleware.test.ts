// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Home page HP-1: what middleware answers for "/" and a protected path,
 * signed out and signed in. Supabase is mocked: getUser() returns the
 * user set per test, and the cookie refresh writes one cookie so the
 * signed-in redirect can be checked for carrying it.
 */
const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));

vi.mock('@/config/env', () => ({
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:8000',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  },
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: { setAll: (cookies: { name: string; value: string; options: object }[]) => void };
    },
  ) => ({
    auth: {
      getUser: async () => {
        if (auth.user) {
          options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'refreshed', options: { path: '/' } }]);
        }
        return { data: { user: auth.user } };
      },
    },
  }),
}));

const { middleware } = await import('@/middleware');

const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, 'https://www.dygoacademy.com'), {
    headers: cookie ? { cookie } : {},
  });

/** The request headers middleware forwards to the page (`x-middleware-request-*`). */
const forwarded = (response: Response, name: string) =>
  response.headers.get(`x-middleware-request-${name}`);

describe('middleware: the public home page at "/" (HP-1)', () => {
  beforeEach(() => {
    auth.user = null;
  });

  it('renders the home page for a signed-out visitor (no redirect)', async () => {
    const response = await middleware(request('/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('sends a signed-in "/" to the garden home, keeping the refreshed session cookie', async () => {
    auth.user = { id: 'user-1' };
    const response = await middleware(request('/'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/garden');
    expect(response.cookies.get('sb-test-auth-token')?.value).toBe('refreshed');
  });

  it('still bounces a signed-out visitor on a protected path through /login?next=', async () => {
    const response = await middleware(request('/review'));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/review');
  });

  it('lets a signed-in learner through to a protected path', async () => {
    auth.user = { id: 'user-1' };
    const response = await middleware(request('/review'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});

describe('middleware: the home page in each language (SEO)', () => {
  beforeEach(() => {
    auth.user = null;
  });

  it.each([
    ['/', 'en-US'],
    ['/vi', 'vi-VN'],
    ['/zh', 'zh-CN'],
  ])('renders %s for a signed-out visitor in %s', async (path, locale) => {
    const response = await middleware(request(path));
    expect(response.status).toBe(200);
    expect(forwarded(response, 'x-dygo-url-locale')).toBe(locale);
  });

  it('ignores a language header the browser sent on other pages', async () => {
    const req = request('/login');
    req.headers.set('x-dygo-url-locale', 'zh-CN');
    const response = await middleware(req);
    expect(forwarded(response, 'x-dygo-url-locale')).toBeNull();
  });

  it('sends "/" to /vi when the visitor chose Vietnamese before', async () => {
    const response = await middleware(request('/', 'dygo_locale=vi-VN'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/vi');
  });

  it('keeps "/" in English with no cookie (crawlers) or an English cookie', async () => {
    expect((await middleware(request('/'))).status).toBe(200);
    expect((await middleware(request('/', 'dygo_locale=en-US'))).status).toBe(200);
  });

  it('stores the page language on /zh so sign-up stays in Chinese', async () => {
    const response = await middleware(request('/zh'));
    expect(response.cookies.get('dygo_locale')?.value).toBe('zh-CN');
    const same = await middleware(request('/zh', 'dygo_locale=zh-CN'));
    expect(same.cookies.get('dygo_locale')).toBeUndefined();
  });

  it('sends a signed-in /vi to the garden home', async () => {
    auth.user = { id: 'user-1' };
    const response = await middleware(request('/vi'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/garden');
  });
});
