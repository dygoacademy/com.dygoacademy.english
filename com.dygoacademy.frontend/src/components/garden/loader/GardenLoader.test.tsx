import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import en from '../../../../messages/en-US.json';
import { renderWithIntl } from '@/test/render';

import {
  GardenLoader,
  CONTINUE_MS,
  SLOW_MS,
  SPINNER_MS,
  SPROUT_MS,
  markAppStarted,
  resetLoaderBootForTests,
} from './GardenLoader';

const nav = vi.hoisted(() => ({ path: '/garden' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.path }));

const phase = () => screen.getByRole('status').getAttribute('data-phase');
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  nav.path = '/garden';
  vi.useFakeTimers();
  resetLoaderBootForTests();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('GardenLoader at app start', () => {
  it('shows LD1, then LD3 at 4 s, then the slow state at 10 s', () => {
    renderWithIntl(<GardenLoader />);
    expect(phase()).toBe('sprout');
    advance(SPROUT_MS - 1);
    expect(phase()).toBe('sprout');
    advance(1);
    expect(phase()).toBe('bee');
    advance(SLOW_MS - SPROUT_MS);
    expect(phase()).toBe('slow');
  });

  it('fades LD1 in with the CSS delay (not a JS timer)', () => {
    const { container } = renderWithIntl(<GardenLoader />);
    expect(container.querySelector('.dg-ld-appear')).not.toBeNull();
  });
});

describe('GardenLoader after the app has started', () => {
  it('shows LD3 at once (fading in after 400 ms, no spinner), the slow state at 10 s', () => {
    renderWithIntl(<GardenLoader />).unmount();
    advance(CONTINUE_MS + 1);
    const { container } = renderWithIntl(<GardenLoader />);
    expect(phase()).toBe('bee');
    expect(container.querySelector('svg.animate-spin')).toBeNull();
    expect(container.querySelector('.dg-ld-appear')).not.toBeNull();
    expect(container.querySelector('[data-phase="bee"] .sr-only')?.textContent).toBe(
      en.screens.live.loading,
    );
    advance(SLOW_MS - 1);
    expect(phase()).toBe('bee');
    advance(1);
    expect(phase()).toBe('slow');
  });
});

describe('GardenLoader hand-over', () => {
  it('a loader that mounts right after another continues its wait', () => {
    const first = renderWithIntl(<GardenLoader />);
    advance(SPROUT_MS + 500);
    expect(phase()).toBe('bee');
    first.unmount();
    advance(100);
    renderWithIntl(<GardenLoader />);
    expect(phase()).toBe('bee');
    advance(SLOW_MS - SPROUT_MS - 600);
    expect(phase()).toBe('slow');
  });

  it('a loader that mounts while the first is still on screen continues it too', () => {
    const first = renderWithIntl(<GardenLoader />);
    advance(1000);
    const second = renderWithIntl(<GardenLoader />);
    first.unmount();
    expect(second.container.querySelector('[data-phase="sprout"]')).not.toBeNull();
    expect(second.container.querySelector('.dg-ld-appear')).toBeNull();
    advance(SPROUT_MS - 1000);
    expect(second.container.querySelector('[data-phase="bee"]')).not.toBeNull();
  });

  it('markAppStarted makes the next loader a later load', () => {
    markAppStarted();
    renderWithIntl(<GardenLoader />);
    expect(phase()).toBe('bee');
  });

  it('startAtBee shows LD3 at once and the slow state at 10 s in total', () => {
    renderWithIntl(<GardenLoader startAtBee />);
    expect(phase()).toBe('bee');
    advance(SLOW_MS - SPINNER_MS);
    expect(phase()).toBe('slow');
  });
});

describe('GardenLoader timers', () => {
  it('clears every timer on unmount', () => {
    const { unmount } = renderWithIntl(<GardenLoader />);
    expect(vi.getTimerCount()).toBe(2);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a pinned phase sets no timers', () => {
    renderWithIntl(<GardenLoader phase="sprout" />);
    expect(phase()).toBe('sprout');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('GardenLoader slow state', () => {
  it('shows Try again, which calls onRetry', () => {
    const onRetry = vi.fn();
    renderWithIntl(<GardenLoader onRetry={onRetry} />);
    advance(SLOW_MS);
    fireEvent.click(screen.getByRole('button', { name: en.screens.live.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('reloads the page when there is no onRetry', () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...original, reload },
      configurable: true,
    });
    renderWithIntl(<GardenLoader />);
    advance(SLOW_MS);
    fireEvent.click(screen.getByRole('button', { name: en.screens.live.retry }));
    expect(reload).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, 'location', { value: original, configurable: true });
  });

  it('has no Try again before the slow state', () => {
    renderWithIntl(<GardenLoader />);
    advance(SPROUT_MS);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('GardenLoader screen reader text', () => {
  it('says "Loading your garden…" and switches once to the slow text', () => {
    renderWithIntl(<GardenLoader />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.querySelector('.sr-only')?.textContent).toBe(en.screens.live.loading);
    advance(SPROUT_MS);
    expect(status.querySelector('.sr-only')?.textContent).toBe(en.screens.live.loading);
    advance(SLOW_MS - SPROUT_MS);
    expect(status.querySelector('.sr-only')?.textContent).toBe(en.screens.loader.slow);
  });

  it('hides the art and the rotating lines from screen readers', () => {
    const { container } = renderWithIntl(<GardenLoader />);
    const rotating = container.querySelector('.dg-ld-lines');
    expect(rotating?.closest('[aria-hidden="true"]')).not.toBeNull();
    advance(SPROUT_MS);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.dg-ld-lines')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('GardenLoader tab bar (LD3b)', () => {
  const tabBar = () => screen.queryByRole('navigation', { name: en.components.tabBar.label });
  const active = () => tabBar()?.querySelector('[aria-current="page"]')?.textContent;

  it('shows the tab bar with the tab being loaded highlighted, from the bee phase on', () => {
    nav.path = '/topics/abc';
    renderWithIntl(<GardenLoader />);
    expect(tabBar()).toBeNull(); // LD1 is full screen, even on a tab screen
    advance(SPROUT_MS);
    expect(phase()).toBe('bee');
    expect(active()).toBe(en.components.tabBar.topics);
    advance(SLOW_MS - SPROUT_MS);
    expect(phase()).toBe('slow');
    expect(active()).toBe(en.components.tabBar.topics);
  });

  it('highlights Garden on /garden', () => {
    renderWithIntl(<GardenLoader phase="bee" />);
    expect(active()).toBe(en.components.tabBar.garden);
  });

  it('has no tab bar on screens without one', () => {
    for (const path of ['/review', '/quiz', '/welcome/level', '/join/abc']) {
      nav.path = path;
      const { unmount } = renderWithIntl(<GardenLoader phase="bee" />);
      expect(tabBar()).toBeNull();
      expect(screen.getByRole('status').querySelector('svg')).not.toBeNull();
      unmount();
    }
  });

  it('keeps Try again working beside the tab bar', () => {
    const onRetry = vi.fn();
    renderWithIntl(<GardenLoader phase="slow" onRetry={onRetry} />);
    expect(tabBar()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en.screens.live.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no "While you wait" card', () => {
    renderWithIntl(<GardenLoader phase="bee" />);
    expect(screen.queryByText(/while you wait/i)).toBeNull();
    expect(Object.keys(en.screens.loader)).not.toContain('words');
  });
});
