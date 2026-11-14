import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { DailyGoalScreen, potFor } from './DailyGoalScreen';

function renderScreen(minutes: 5 | 10 | 15 = 10, extra: { error?: boolean } = {}) {
  const onPick = vi.fn();
  const onSave = vi.fn();
  renderWithIntl(
    <div data-ui="garden">
      <DailyGoalScreen framed backHref="/me" minutes={minutes} onPick={onPick} onSave={onSave} {...extra} />
    </div>,
  );
  return { onPick, onSave };
}

describe('potFor', () => {
  it('picks the tier at or below the saved goal, Steady when unknown', () => {
    expect(potFor(5)).toBe(5);
    expect(potFor(10)).toBe(10);
    expect(potFor(15)).toBe(15);
    expect(potFor(20)).toBe(15);
    expect(potFor(30)).toBe(15);
    expect(potFor(1)).toBe(5);
    expect(potFor(null)).toBe(10);
  });
});

describe('DailyGoalScreen (A8b)', () => {
  it('shows the three pots with Steady picked and 70 minutes a week', () => {
    renderScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /Steady/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('70')).toBeTruthy();
    expect(screen.getByText('Busy day? A rain barrel keeps your streak safe. You can hold up to 3.')).toBeTruthy();
    expect(screen.queryByText(/Road to Band/)).toBeNull();
  });

  it('picks a pot and saves', () => {
    const { onPick, onSave } = renderScreen(15);
    expect(screen.getByText('105')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Light/ }));
    expect(onPick).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByRole('button', { name: 'Save goal' }));
    expect(onSave).toHaveBeenCalled();
  });

  it('says when the save failed', () => {
    renderScreen(10, { error: true });
    expect(screen.getByText("Couldn't save. Check your connection and try again.")).toBeTruthy();
  });
});
