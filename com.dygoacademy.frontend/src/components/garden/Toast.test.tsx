import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Toast } from './Toast';

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps a live region in the DOM and shows the message when open', () => {
    const { rerender } = render(<Toast open={false} onOpenChange={() => {}} message="Saved" />);
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');
    rerender(<Toast open onOpenChange={() => {}} message="Saved" />);
    expect(screen.getByRole('status').textContent).toContain('Saved');
  });

  it('closes itself after 3 seconds', () => {
    const onOpenChange = vi.fn();
    render(<Toast open onOpenChange={onOpenChange} message="Saved" />);
    act(() => vi.advanceTimersByTime(2999));
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
