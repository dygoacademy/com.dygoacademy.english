import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

// This JavaScript is build-a; /api/version answers with `deployed`.
vi.stubEnv('NEXT_PUBLIC_BUILD_ID', 'build-a');
const server = vi.hoisted(() => ({ deployed: 'build-a' }));
vi.stubGlobal(
  'fetch',
  vi.fn(async () => ({ ok: true, json: async () => ({ build_id: server.deployed }) })),
);

const appVersion = await import('@/lib/app-version');
const { AppUpdateWatcher, AWAY_RELOAD_MS } = await import('./AppUpdateWatcher');

const reload = vi.fn();

beforeEach(() => {
  appVersion.resetUpdateStatusForTests();
  server.deployed = 'build-a';
  Object.defineProperty(window, 'location', { value: { ...window.location, reload }, configurable: true });
  reload.mockClear();
});

afterEach(() => vi.useRealTimers());

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  fireEvent(document, new Event('visibilitychange'));
}

describe('AppUpdateWatcher', () => {
  it('shows nothing while the app is current', () => {
    renderWithIntl(<AppUpdateWatcher />);
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull();
  });

  it('Reload on a new build reloads the app', async () => {
    server.deployed = 'build-b';
    await act(async () => void renderWithIntl(<AppUpdateWatcher />));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reload' })));
    expect(reload).toHaveBeenCalled();
  });

  it('a chunk missing from the new build reloads once', async () => {
    renderWithIntl(<AppUpdateWatcher />);
    const error = new Error('Loading chunk 77 failed.');
    error.name = 'ChunkLoadError';
    await act(async () => {
      window.dispatchEvent(new ErrorEvent('error', { error }));
      window.dispatchEvent(new ErrorEvent('error', { error }));
    });
    expect(reload).toHaveBeenCalledTimes(1);
    window.sessionStorage.clear();
  });

  it('a new build shows a banner that can be closed with Later', async () => {
    server.deployed = 'build-b';
    await act(async () => void renderWithIntl(<AppUpdateWatcher />));
    expect(screen.getByText('There’s a new version of Dygo.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByText('There’s a new version of Dygo.')).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it('a new build reloads by itself only after 5+ minutes away', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    server.deployed = 'build-b';
    await act(async () => void renderWithIntl(<AppUpdateWatcher />));
    setVisibility('hidden');
    await act(async () => setVisibility('visible'));
    expect(reload).not.toHaveBeenCalled();
    setVisibility('hidden');
    vi.setSystemTime(Date.now() + AWAY_RELOAD_MS);
    await act(async () => setVisibility('visible'));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
