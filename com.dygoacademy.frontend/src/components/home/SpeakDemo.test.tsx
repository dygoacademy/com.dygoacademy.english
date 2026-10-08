import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { HomeScreen } from './HomeScreen';
import { LISTEN_MS, SpeakDemo } from './SpeakDemo';

afterEach(() => vi.useRealTimers());

describe('SpeakDemo (Home page #speak)', () => {
  it('goes idle → Listening… → the sample result, and Try again resets it', () => {
    vi.useFakeTimers();
    const { container } = renderWithIntl(<SpeakDemo registerHref="/register" />);
    const card = () => container.querySelector('[data-speak-demo]')!;
    expect(card().getAttribute('data-speak-demo')).toBe('idle');
    expect(screen.getByText('Tap the mic to try it')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try saying the sentence' }));
    expect(screen.getByText('Listening…')).toBeTruthy();
    act(() => void vi.advanceTimersByTime(LISTEN_MS));

    expect(card().getAttribute('data-speak-demo')).toBe('compared');
    expect(screen.getByText('In bloom · 76% match')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Practise free' }).getAttribute('href')).toBe('/register');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(card().getAttribute('data-speak-demo')).toBe('idle');
  });

  it('never asks for the microphone and hides Play without a real native clip', () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    renderWithIntl(<SpeakDemo registerHref="/register" initialState="compared" />);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Play the native speaker' })).toBeNull();
  });

  it('is linked from the hero pill and the desktop nav', () => {
    renderWithIntl(<HomeScreen locale="en-US" onLanguageChange={() => {}} registerHref="/register" loginHref="/login" />);
    expect(document.getElementById('speak')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Speaking practice with a native speaker/ }).getAttribute('href')).toBe('#speak');
    expect(screen.getByRole('link', { name: 'Speaking' }).getAttribute('href')).toBe('#speak');
  });
});
