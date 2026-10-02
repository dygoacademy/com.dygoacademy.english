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

const request = (path: string) => new NextRequest(new URL(path, 'https://www.dygoacademy.com'));

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

  it('leaves /search reachable for guests', async () => {
    const response = await middleware(request('/search'));
    expect(response.status).toBe(200);
  });
});
