import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { HomeScreen } from './HomeScreen';
import { LISTEN_MS, SpeakDemo } from './SpeakDemo';

afterEach(() => vi.useRealTimers());

describe('SpeakDemo (Home page #speak, canvas 2026-10-10)', () => {
  it('goes idle → Listening… (moving bars) → the sample result, and Try again resets it', () => {
    vi.useFakeTimers();
    const { container } = renderWithIntl(<SpeakDemo registerHref="/register" />);
    const card = () => container.querySelector('[data-speak-demo]')!;
    expect(card().getAttribute('data-speak-demo')).toBe('idle');
    expect(screen.getByText('Try it now')).toBeTruthy();
    expect(container.querySelectorAll('.home-speak-wave')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Try the demo' }));
    expect(screen.getByText('Listening…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stop' }).className).toContain('home-speak-ring');
    expect(container.querySelectorAll('.home-speak-wave').length).toBeGreaterThan(0);
    act(() => void vi.advanceTimersByTime(LISTEN_MS));

    expect(card().getAttribute('data-speak-demo')).toBe('compared');
    expect(screen.getByText('In bloom · 76% match')).toBeTruthy();
    expect(container.querySelectorAll('.home-speak-wave')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Practice for free' }).getAttribute('href')).toBe('/register');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(card().getAttribute('data-speak-demo')).toBe('idle');
  });

  it('Stop shows the result straight away', () => {
    const { container } = renderWithIntl(<SpeakDemo registerHref="/register" initialState="listening" />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(container.querySelector('[data-speak-demo]')!.getAttribute('data-speak-demo')).toBe('compared');
  });

  it('never asks for the microphone', () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    renderWithIntl(<SpeakDemo registerHref="/register" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try the demo' }));
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('is linked from the desktop nav (the hero pill was removed, canvas 2026-10-08)', () => {
    renderWithIntl(<HomeScreen locale="en-US" onLanguageChange={() => {}} registerHref="/register" loginHref="/login" />);
    expect(document.getElementById('speak')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Speaking practice with a native speaker/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Speaking' }).getAttribute('href')).toBe('#speak');
  });
});
