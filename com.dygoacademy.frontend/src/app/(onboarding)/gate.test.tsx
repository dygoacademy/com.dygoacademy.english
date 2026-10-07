import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Who sees onboarding (OB1–OB5): the garden home sends a learner with
 * `onboarded_at` null to OB1, /welcome sends everyone else to the garden,
 * and needsOnboarding() only says yes for a real null (never for a missing
 * column, a missing row or a failed read).
 */
class Redirect extends Error {
  constructor(readonly to: string) {
    super(`NEXT_REDIRECT ${to}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

vi.mock('@/components/garden/live/HomeLive', () => ({ HomeLive: () => null }));
vi.mock('@/app/(garden)/layout', () => ({ generateViewport: vi.fn() }));
vi.mock('@/app/(garden)/GardenRoot', () => ({
  GardenRoot: ({ children }: { children: React.ReactNode }) => children,
}));

const gate = { user: { id: 'u1' } as { id: string } | null, needs: false };
vi.mock('@/i18n/garden-locale', () => ({
  getGardenUser: async () => ({ supabase: null, user: gate.user }),
  needsOnboarding: async () => gate.needs,
  getGardenLocaleContext: async () => ({
    appLocale: 'en-US',
    formatLocale: 'en-US',
    timeZone: 'UTC',
    meaningLocale: null,
    stored: { uiLocale: null, meaningLocale: null },
    signedIn: true,
  }),
}));

import GardenHomePage from '../(garden)/garden/page';
import OnboardingLayout from './layout';

async function redirectOf(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    if (error instanceof Redirect) return error.to;
    throw error;
  }
}

beforeEach(() => {
  gate.user = { id: 'u1' };
  gate.needs = false;
});

describe('garden home (A1) onboarding gate', () => {
  it('sends a learner who has not finished onboarding to OB1', async () => {
    gate.needs = true;
    expect(await redirectOf(() => GardenHomePage())).toBe('/welcome/level');
  });

  it('opens the garden for everyone else (existing learners are backfilled as done)', async () => {
    expect(await redirectOf(() => GardenHomePage())).toBeNull();
  });
});

describe('/welcome layout', () => {
  const render = () => OnboardingLayout({ children: 'step' });

  it('signed out → sign in', async () => {
    gate.user = null;
    expect(await redirectOf(render)).toBe('/login');
  });

  it('already onboarded → the garden (never forced, never repeated)', async () => {
    expect(await redirectOf(render)).toBe('/garden');
  });

  it('a new learner gets the step', async () => {
    gate.needs = true;
    expect(await redirectOf(render)).toBeNull();
  });
});
