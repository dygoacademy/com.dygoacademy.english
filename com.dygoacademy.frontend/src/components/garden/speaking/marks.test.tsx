import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SpeakingWordMark } from '@/types';

import { SpeakingPlant } from './SpeakingPlant';
import { StageScore } from './StageScore';
import { WordMarks } from './WordMarks';

const WORDS = 'Planting more trees can help mitigate the effects.'.split(' ');

describe('WordMarks', () => {
  const marks: SpeakingWordMark[] = WORDS.map((_, index) => ({
    index,
    ok: index !== 5 && index !== 2,
    reason: index === 5 ? 'stress_soft' : index === 2 ? 'missing' : null,
  }));

  it('underlines fine words and boxes the ones that need work with a reason', () => {
    const { container } = render(
      <WordMarks
        words={WORDS}
        marks={marks}
        reasonText={(m) => (m.reason === 'stress_soft' ? 'MIT is too soft' : null)}
      />,
    );
    const p = container.querySelector('p')!;
    expect(p.getAttribute('lang')).toBe('en');
    expect(container.querySelectorAll('[data-mark="ok"]')).toHaveLength(6);
    const soft = container.querySelector('[data-mark="stress_soft"]')!;
    expect(soft.textContent).toBe('mitigateMIT is too soft');
    expect(container.querySelector('[data-mark="missing"]')!.textContent).toBe('trees');
    expect(screen.getByText('MIT is too soft')).toBeTruthy();
  });

  it('shows a word without a mark as fine', () => {
    const { container } = render(
      <WordMarks words={['Hello', 'world']} marks={[]} reasonText={() => null} />,
    );
    expect(container.querySelectorAll('[data-mark="ok"]')).toHaveLength(2);
  });
});

describe('StageScore', () => {
  it.each([
    ['seed', 1],
    ['sprout', 2],
    ['bloom', 3],
    ['fruit', 4],
  ] as const)('%s fills %i of 4 segments and shows its plant', (stage, filled) => {
    const { container } = render(
      <StageScore stage={stage} title={`${stage} · 82% match`} scale={<b>Fruit at 90%</b>} />,
    );
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(filled);
    expect(container.querySelector('svg')!.getAttribute('data-stage')).toBe(stage);
    expect(screen.getByText(`${stage} · 82% match`)).toBeTruthy();
    expect(screen.getByText('Fruit at 90%').tagName).toBe('B');
  });
});

describe('SpeakingPlant', () => {
  it('draws a different plant per stage, hidden from screen readers', () => {
    const html = (['seed', 'sprout', 'bloom', 'fruit'] as const).map(
      (s) => render(<SpeakingPlant stage={s} />).container.innerHTML,
    );
    expect(new Set(html).size).toBe(4);
    expect(html[0]).toContain('aria-hidden="true"');
  });
});
