import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { RatingBar } from './RatingBar';

const INTERVALS = {
  again: { unit: 'minutes', count: 1 },
  hard: { unit: 'minutes', count: 8 },
  good: { unit: 'days', count: 3 },
  easy: { unit: 'days', count: 8 },
} as const;

describe('RatingBar', () => {
  it('renders four buttons with their label and interval', () => {
    renderWithIntl(<RatingBar intervals={INTERVALS} onRate={() => {}} />);
    const group = screen.getByRole('group', { name: 'How well did you remember it?' });
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Again.*1 min/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hard.*8 min/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Good.*3 days/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Easy.*8 days/ })).toBeTruthy();
  });

  it('fires the rating on tap', () => {
    const onRate = vi.fn();
    renderWithIntl(<RatingBar intervals={INTERVALS} onRate={onRate} />);
    fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    expect(onRate).toHaveBeenCalledWith('good');
  });

  it.each([
    ['1', 'again'],
    ['2', 'hard'],
    ['3', 'good'],
    ['4', 'easy'],
  ])('key %s fires %s', (key, rating) => {
    const onRate = vi.fn();
    renderWithIntl(<RatingBar intervals={INTERVALS} onRate={onRate} />);
    fireEvent.keyDown(window, { key });
    expect(onRate).toHaveBeenCalledTimes(1);
    expect(onRate).toHaveBeenCalledWith(rating);
  });

  it('ignores other keys, modifiers and held-down repeats', () => {
    const onRate = vi.fn();
    renderWithIntl(<RatingBar intervals={INTERVALS} onRate={onRate} />);
    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: '1', metaKey: true });
    fireEvent.keyDown(window, { key: '2', ctrlKey: true });
    fireEvent.keyDown(window, { key: '3', altKey: true });
    fireEvent.keyDown(window, { key: '4', repeat: true });
    expect(onRate).not.toHaveBeenCalled();
  });

  it('ignores keys typed into a text field', () => {
    const onRate = vi.fn();
    renderWithIntl(
      <>
        <input aria-label="note" />
        <RatingBar intervals={INTERVALS} onRate={onRate} />
      </>,
    );
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'note' }), { key: '3' });
    expect(onRate).not.toHaveBeenCalled();
  });

  it('is disabled while saving: buttons disabled, taps and keys ignored', () => {
    const onRate = vi.fn();
    renderWithIntl(<RatingBar intervals={INTERVALS} onRate={onRate} disabled />);
    const buttons = screen.getByRole('group').querySelectorAll('button');
    buttons.forEach((button) => expect(button.disabled).toBe(true));
    expect(screen.getByRole('group').getAttribute('aria-busy')).toBe('true');
    fireEvent.click(buttons[2]);
    fireEvent.keyDown(window, { key: '3' });
    expect(onRate).not.toHaveBeenCalled();
  });

  it('re-enables the keys when saving finishes', () => {
    const onRate = vi.fn();
    const { rerender } = renderWithIntl(
      <RatingBar intervals={INTERVALS} onRate={onRate} disabled />,
    );
    fireEvent.keyDown(window, { key: '1' });
    expect(onRate).not.toHaveBeenCalled();
    rerender(<RatingBar intervals={INTERVALS} onRate={onRate} />);
    fireEvent.keyDown(window, { key: '1' });
    expect(onRate).toHaveBeenCalledWith('again');
  });

  it('shows key hints only after keyboard use, and hides them on the next tap', () => {
    renderWithIntl(<RatingBar intervals={INTERVALS} onRate={() => {}} />);
    expect(screen.queryAllByTestId('rating-key-hint')).toHaveLength(0);
    fireEvent.keyDown(window, { key: 'Tab' });
    const hints = screen.getAllByTestId('rating-key-hint');
    expect(hints.map((hint) => hint.textContent)).toEqual(['1', '2', '3', '4']);
    fireEvent.pointerDown(window, { pointerType: 'touch' });
    expect(screen.queryAllByTestId('rating-key-hint')).toHaveLength(0);
  });

  it('does not listen for keys when keyboardShortcuts is off', () => {
    const onRate = vi.fn();
    renderWithIntl(<RatingBar intervals={INTERVALS} onRate={onRate} keyboardShortcuts={false} />);
    fireEvent.keyDown(window, { key: '3' });
    expect(onRate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /Good/ }).getAttribute('aria-keyshortcuts'),
    ).toBeNull();
  });

  it('exposes aria-keyshortcuts 1–4', () => {
    renderWithIntl(<RatingBar intervals={INTERVALS} onRate={() => {}} />);
    const keys = Array.from(screen.getByRole('group').querySelectorAll('button')).map((button) =>
      button.getAttribute('aria-keyshortcuts'),
    );
    expect(keys).toEqual(['1', '2', '3', '4']);
  });
});
