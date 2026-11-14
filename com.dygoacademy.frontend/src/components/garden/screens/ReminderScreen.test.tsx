import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import {
  reminderClock,
  reminderSky,
  ReminderScreen,
  type ReminderScreenProps,
} from './ReminderScreen';

function renderScreen(props: Partial<ReminderScreenProps> = {}) {
  const handlers = {
    onToggle: vi.fn(),
    onTime: vi.fn(),
    onSmart: vi.fn(),
    onDays: vi.fn(),
    onChannel: vi.fn(),
  };
  renderWithIntl(
    <div data-ui="garden">
      <ReminderScreen
        backHref="/me"
        on
        minutes={7 * 60 + 30}
        smart={false}
        days={[1, 2, 3, 4, 5, 6]}
        channels={['push']}
        framed
        {...handlers}
        {...props}
      />
    </div>,
  );
  return handlers;
}

describe('reminderClock / reminderSky', () => {
  it('writes 24-hour times without a leading zero', () => {
    expect(reminderClock(450)).toBe('7:30');
    expect(reminderClock(1260)).toBe('21:00');
  });
  it('puts the sun where the board does', () => {
    expect(reminderSky(450)).toMatchObject({ left: `${28 / 3}%`, top: '70%', night: false });
    expect(reminderSky(1260)).toMatchObject({ left: '92%', top: '78%', night: true });
    expect(reminderSky(750).sky).toBe('var(--reminder-sky-day)');
  });
});

describe('ReminderScreen (A8c)', () => {
  it('on: presets, Smart time, days and channels; Zalo and Email are Soon and disabled', () => {
    renderScreen();
    expect(screen.getByRole('switch', { name: 'Ripening reminder' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('button', { name: 'Morning · 7:30' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Sunday' }).getAttribute('aria-pressed')).toBe('false');
    expect((screen.getByRole('switch', { name: 'Zalo (Soon)' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('switch', { name: 'Email (Soon)' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Quiet hours: no reminders between 22:00 and 7:00.')).toBeTruthy();
  });

  it('saves each change through its handler', () => {
    const h = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Evening · 21:00' }));
    expect(h.onTime).toHaveBeenCalledWith(1260);
    fireEvent.click(screen.getByRole('switch', { name: 'Smart time' }));
    expect(h.onSmart).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Sunday' }));
    expect(h.onDays).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6, 7]);
    fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
    expect(h.onDays).toHaveBeenLastCalledWith([2, 3, 4, 5, 6]);
    fireEvent.click(screen.getByRole('switch', { name: 'Phone notification' }));
    expect(h.onChannel).toHaveBeenCalledWith('push', false);
  });

  it('keeps the last day: unticking it does nothing', () => {
    const h = renderScreen({ days: [3] });
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    expect(h.onDays).not.toHaveBeenCalled();
  });

  it('Smart time shows "Smart" in the sky', () => {
    renderScreen({ smart: true });
    expect(screen.getByText('Smart')).toBeTruthy();
  });

  it('off: only the main switch and the note', () => {
    const h = renderScreen({ on: false });
    expect(screen.queryByRole('button', { name: 'Morning · 7:30' })).toBeNull();
    expect(screen.getByText(/Reminders are off\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: 'Ripening reminder' }));
    expect(h.onToggle).toHaveBeenCalledWith(true);
  });
});
