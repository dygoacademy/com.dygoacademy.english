import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MyProfile } from '@/hooks/useProfile';
import { accentOf } from '@/lib/accent';
import { renderWithIntl } from '@/test/render';

import { GardenPreferencesProvider } from '../preferences';
import { LanguageLive } from './LanguageLive';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, replace: vi.fn() }) }));

const reloadTo = vi.fn();
vi.mock('./reload', () => ({ reloadTo: (path: string) => reloadTo(path) }));

const setGardenLocaleCookie = vi.fn(async (_locale: string) => {});
vi.mock('@/app/(garden)/actions', () => ({
  setGardenLocaleCookie: (locale: string) => setGardenLocaleCookie(locale),
}));

const patch = vi.fn();
const get = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: { patch: (...a: unknown[]) => patch(...a), get: (...a: unknown[]) => get(...a) },
}));

const PROFILE: MyProfile = {
  id: 'u1',
  ui_locale: 'en-US',
  meaning_locale: null,
  english_variety: 'en-US',
  daily_goal_minutes: 10,
};

function renderLive(queryClient: QueryClient, appLocale: 'en-US' | 'vi-VN' = 'en-US') {
  return renderWithIntl(
    <QueryClientProvider client={queryClient}>
      <GardenPreferencesProvider
        value={{ appLocale, meaningLocale: null, storedUiLocale: appLocale }}
      >
        <div data-ui="garden">
          <LanguageLive />
        </div>
      </GardenPreferencesProvider>
    </QueryClientProvider>,
  );
}

describe('LanguageLive (A8f)', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    patch.mockReset();
    setGardenLocaleCookie.mockClear();
    reloadTo.mockReset();
  });

  it('Tiếng Việt + UK English: saves both, sets the cookie, the accent becomes UK, reloads Me in Vietnamese', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['profile', 'me'], PROFILE);
    patch.mockResolvedValue({ ...PROFILE, ui_locale: 'vi-VN', english_variety: 'en-GB' });
    renderLive(queryClient);

    fireEvent.click(screen.getByRole('radio', { name: 'Tiếng Việt' }));
    fireEvent.click(screen.getByRole('radio', { name: 'UK English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // A full load, so the layout's messages come back in the new language
    // (a soft push kept the old ones: what Dylan saw on UAT).
    await waitFor(() => expect(reloadTo).toHaveBeenCalledWith('/me'));
    expect(push).not.toHaveBeenCalled();
    expect(setGardenLocaleCookie).toHaveBeenCalledWith('vi-VN');
    expect(patch).toHaveBeenCalledWith('/profiles/me', {
      uiLocale: 'vi-VN',
      englishVariety: 'en-GB',
    });
    const saved = queryClient.getQueryData<MyProfile>(['profile', 'me']);
    expect(accentOf(saved?.english_variety)).toBe('UK');
  });

  it('accent only: saves it and goes back to Me without a reload', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['profile', 'me'], PROFILE);
    patch.mockResolvedValue({ ...PROFILE, english_variety: 'en-GB' });
    renderLive(queryClient);
    fireEvent.click(screen.getByRole('radio', { name: 'UK English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/me'));
    expect(reloadTo).not.toHaveBeenCalled();
    expect(setGardenLocaleCookie).not.toHaveBeenCalled();
  });

  it('reopened: both saved choices are selected', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['profile', 'me'], {
      ...PROFILE,
      ui_locale: 'vi-VN',
      english_variety: 'en-GB',
    });
    renderLive(queryClient, 'vi-VN');
    expect(screen.getByRole('radio', { name: 'Tiếng Việt' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getByRole('radio', { name: 'UK English' }).getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('accent only: no cookie change, and a failed save stays on the screen', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['profile', 'me'], PROFILE);
    patch.mockRejectedValue(new Error('offline'));
    renderLive(queryClient);
    fireEvent.click(screen.getByRole('radio', { name: 'UK English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText(/Couldn't save/)).toBeTruthy());
    expect(setGardenLocaleCookie).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
