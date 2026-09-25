import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StageTile } from './StageTile';

describe('StageTile', () => {
  it('is a toggle button with aria-pressed', () => {
    const { rerender } = render(<StageTile stage="tree" count="42" label="Ripe" />);
    const tile = screen.getByRole('button', { name: /42\s*Ripe/ });
    expect(tile.getAttribute('aria-pressed')).toBe('false');
    expect(tile.getAttribute('type')).toBe('button');
    rerender(<StageTile stage="tree" count="42" label="Ripe" selected />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the glyph decorative so the label names the stage', () => {
    const { container } = render(<StageTile stage="wilting" count="3" label="Wilting" />);
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('calls onClick', () => {
    const onClick = vi.fn();
    render(<StageTile stage="seed" count="5" label="Seeds" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
