import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import vi_messages from '../../messages/vi-VN.json';

const request = vi.hoisted(() => ({ cookie: undefined as string | undefined, accept: 'en-US' }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (request.cookie ? { value: request.cookie } : undefined) }),
  headers: async () => ({ get: () => request.accept }),
}));

vi.mock('./(garden)/fonts', () => ({ gardenFontVariables: '' }));

const { default: Loading } = await import('./loading');

describe('root loading', () => {
  it('is the loading screen (LD1 at app start), in English by default', async () => {
    render(await Loading());
    const status = screen.getByRole('status');
    expect(status.getAttribute('data-phase')).toBe('sprout');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.querySelector('.sr-only')?.textContent).toBe('Loading your garden…');
  });

  it('follows the dygo_locale cookie, then Accept-Language', async () => {
    request.cookie = 'vi-VN';
    const { unmount } = render(await Loading());
    expect(screen.getByRole('status').querySelector('.sr-only')?.textContent).toBe(
      vi_messages.screens.live.loading,
    );
    unmount();
    request.cookie = undefined;
    request.accept = 'vi,en;q=0.5';
    render(await Loading());
    expect(screen.getByRole('status').querySelector('.sr-only')?.textContent).toBe(
      vi_messages.screens.live.loading,
    );
  });
});
