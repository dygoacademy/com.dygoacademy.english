import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * needsOnboarding() (garden-locale.ts): true only for a profile whose
 * `onboarded_at` is really null. A missing column (20261008 migration not
 * applied yet), no row, no user or a failed read all count as done.
 */
const state: { user: { id: string } | null; row: unknown; fail: boolean } = {
  user: { id: 'u1' },
  row: null,
  fail: false,
};

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (state.fail) throw new Error('down');
            return { data: state.row };
          },
        }),
      }),
    }),
  }),
}));

beforeEach(() => {
  vi.resetModules();
  state.user = { id: 'u1' };
  state.row = null;
  state.fail = false;
});

async function needs() {
  const { needsOnboarding } = await import('./garden-locale');
  return needsOnboarding();
}

describe('needsOnboarding', () => {
  it('is true for a new learner (onboarded_at null)', async () => {
    state.row = { id: 'u1', onboarded_at: null };
    expect(await needs()).toBe(true);
  });

  it('is false once onboarded', async () => {
    state.row = { id: 'u1', onboarded_at: '2026-10-08T08:00:00Z' };
    expect(await needs()).toBe(false);
  });

  it('is false before the migration (no onboarded_at column)', async () => {
    state.row = { id: 'u1', ui_locale: 'en-US' };
    expect(await needs()).toBe(false);
  });

  it('is false with no profile, no user or a failed read', async () => {
    expect(await needs()).toBe(false);
    state.user = null;
    expect(await needs()).toBe(false);
    state.user = { id: 'u1' };
    state.fail = true;
    expect(await needs()).toBe(false);
  });
});

describe('onboardingResumePath (old /welcome/goal and /welcome/bed links)', () => {
  async function resume() {
    const { onboardingResumePath } = await import('./garden-locale');
    return onboardingResumePath();
  }

  it('is OB1 About you until a goal is saved', async () => {
    state.row = { id: 'u1', onboarded_at: null, study_goal: null };
    expect(await resume()).toBe('/welcome/level');
    state.row = null;
    expect(await resume()).toBe('/welcome/level');
  });

  it('is OB4 Reminder once a goal is saved', async () => {
    state.row = { id: 'u1', onboarded_at: null, study_goal: 'WORK' };
    expect(await resume()).toBe('/welcome/reminder');
  });
});
