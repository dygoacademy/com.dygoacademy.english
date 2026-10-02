import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PLANT_GLYPH_SIZES, PlantGlyph } from './PlantGlyph';
import { PLANT_STAGES } from './plantStage';

describe('PlantGlyph', () => {
  it('is decorative (aria-hidden, no role) by default', () => {
    const { container } = render(<PlantGlyph stage="seed" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('becomes role="img" with the label when one is given', () => {
    const { getByRole } = render(<PlantGlyph stage="tree" aria-label="Fruit tree" />);
    const svg = getByRole('img', { name: 'Fruit tree' });
    expect(svg.getAttribute('aria-hidden')).toBeNull();
  });

  it.each(PLANT_STAGES)('renders the %s stage at every size', (stage) => {
    for (const size of PLANT_GLYPH_SIZES) {
      const { container, unmount } = render(<PlantGlyph stage={stage} size={size} />);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('data-stage')).toBe(stage);
      expect(svg.getAttribute('width')).toBe(String(size));
      expect(svg.querySelectorAll('path, circle, ellipse').length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('adds the drip only when asked', () => {
    const { container, rerender } = render(<PlantGlyph stage="thirsty" />);
    expect(container.querySelector('.drip')).toBeNull();
    rerender(<PlantGlyph stage="thirsty" animate="drip" />);
    expect(container.querySelector('.drip')).not.toBeNull();
    rerender(<PlantGlyph stage="flower" animate="bloom" />);
    expect(container.querySelector('svg')!.getAttribute('class')).toContain('bloom');
  });
});

describe('PlantGlyph variants', () => {
  it('uses the canvas size for each variant when no size is given', () => {
    const cases = [
      ['row', 'flower', '30', '36'],
      ['row', 'tree', '34', '38'],
      ['tile', 'tree', '36', '44'],
      ['topic', 'tree', '46', '50'],
    ] as const;
    for (const [variant, stage, width, height] of cases) {
      const { container, unmount } = render(<PlantGlyph stage={stage} variant={variant} />);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('width')).toBe(width);
      expect(svg.getAttribute('height')).toBe(height);
      unmount();
    }
  });
});
