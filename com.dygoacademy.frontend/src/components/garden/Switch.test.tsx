import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch';

describe('Switch', () => {
  it('is a switch with aria-checked reflecting the state', () => {
    const { rerender } = render(<Switch aria-label="Daily reminder" checked={false} />);
    const control = screen.getByRole('switch', { name: 'Daily reminder' });
    expect(control.getAttribute('aria-checked')).toBe('false');
    expect(control.getAttribute('type')).toBe('button');
    rerender(<Switch aria-label="Daily reminder" checked />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('asks for the opposite state on click', () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Sounds" checked={false} onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Sounds' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('can be labelled by another element', () => {
    render(
      <>
        <span id="label">Reminders</span>
        <Switch aria-labelledby="label" checked />
      </>,
    );
    expect(screen.getByRole('switch', { name: 'Reminders' })).toBeTruthy();
  });

  it('does nothing when disabled', () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Sounds" checked disabled onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole('switch', { name: 'Sounds' }) as HTMLButtonElement;
    expect(control.disabled).toBe(true);
    fireEvent.click(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
