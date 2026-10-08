import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

/** AU2 → OB1: where a new account lands right after sign-up. */
const push = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => search,
}));
vi.mock('@/app/(garden)/actions', () => ({ setGardenLocaleCookie: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { patch: vi.fn().mockResolvedValue({}) } }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: async () => ({ data: { session: {}, user: { id: 'u1' } }, error: null }),
    },
    from: () => ({ update: () => ({ eq: async () => ({}) }) }),
  }),
}));
vi.mock('../preferences', () => ({ useGardenPreferences: () => ({ appLocale: 'en-US' }) }));

import { RegisterLive } from './RegisterLive';

async function signUp() {
  renderWithIntl(
    <div data-ui="garden">
      <RegisterLive />
    </div>,
  );
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Minh' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'minh@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'gardenpass' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }));
  });
}

beforeEach(() => {
  push.mockReset();
  search = new URLSearchParams();
});

describe('RegisterLive after sign-up', () => {
  it('a new learner starts onboarding (OB1)', async () => {
    await signUp();
    expect(push).toHaveBeenCalledWith('/welcome/level');
  });

  it('an invite sign-up still goes straight to its group', async () => {
    search = new URLSearchParams({ next: '/join/abc' });
    await signUp();
    expect(push).toHaveBeenCalledWith('/join/abc');
  });
});
