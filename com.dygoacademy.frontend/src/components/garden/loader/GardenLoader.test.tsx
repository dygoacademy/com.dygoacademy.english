import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import en from '../../../../messages/en-US.json';
import { renderWithIntl } from '@/test/render';

import {
  GardenLoader,
  SLOW_MS,
  SPINNER_MS,
  SPROUT_MS,
  resetLoaderBootForTests,
} from './GardenLoader';
import { WAIT_WORDS } from './words';

const phase = () => screen.getByRole('status').getAttribute('data-phase');
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
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
  it('shows the spinner, LD3 at 2.5 s, the slow state at 10 s', () => {
    renderWithIntl(<GardenLoader />).unmount();
    const { container } = renderWithIntl(<GardenLoader />);
    expect(phase()).toBe('spinner');
    expect(container.querySelector('svg.animate-spin')).not.toBeNull();
    expect(container.querySelector('.dg-ld-appear')).toBeNull();
    advance(SPINNER_MS);
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
    renderWithIntl(<GardenLoader phase="bee" word="bloom" />);
    expect(phase()).toBe('bee');
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

describe('GardenLoader word card', () => {
  it('shows one of the words, with lang="en" on the word', () => {
    renderWithIntl(<GardenLoader />);
    advance(SPROUT_MS);
    const word = WAIT_WORDS.map((w) => w.word).find(
      (w) => document.querySelector(`[lang="en"]`)?.textContent === w,
    );
    expect(word).toBeTruthy();
    expect(screen.getByText(en.screens.loader.wait)).toBeTruthy();
  });

  it('pins the word, with its meaning and part of speech', () => {
    renderWithIntl(<GardenLoader phase="bee" word="resilient" />);
    expect(screen.getByText('resilient').getAttribute('lang')).toBe('en');
    expect(screen.getByText(/able to recover quickly from difficulty/)).toBeTruthy();
    expect(screen.getByText(/adjective/)).toBeTruthy();
  });

  it('has a meaning in every language for all 8 words', () => {
    expect(WAIT_WORDS).toHaveLength(8);
    for (const w of WAIT_WORDS) {
      expect((en.screens.loader.words as Record<string, string>)[w.key]).toBeTruthy();
    }
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
