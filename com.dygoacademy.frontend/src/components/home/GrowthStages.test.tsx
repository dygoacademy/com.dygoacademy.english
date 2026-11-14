import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { GrowthStages } from './GrowthStages';

describe('GrowthStages (Home page v2 How your words grow, HP-7)', () => {
  it('lists the four stages in order, each with Reviews and Grows when; Fruiting uses Stays that way if', () => {
    renderWithIntl(
      <div data-ui="garden">
        <GrowthStages />
      </div>,
    );
    // The arrows between the cards are aria-hidden, so only the four stages are list items.
    const stages = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(stages).toHaveLength(4);
    expect(stages.map((stage) => within(stage).getByText(/^Stage \d$/).textContent)).toEqual([
      'Stage 1',
      'Stage 2',
      'Stage 3',
      'Stage 4',
    ]);
    ['Seed', 'Sprout', 'Flower', 'Fruiting'].forEach((name, i) => {
      expect(within(stages[i]).getByText(name)).toBeTruthy();
      expect(within(stages[i]).getByText('Reviews:')).toBeTruthy();
    });
    for (const stage of stages.slice(0, 3)) {
      expect(within(stage).getByText('Grows when:')).toBeTruthy();
      expect(within(stage).queryByText('Stays that way if:')).toBeNull();
    }
    expect(within(stages[3]).getByText('Stays that way if:')).toBeTruthy();
    expect(within(stages[3]).queryByText('Grows when:')).toBeNull();
  });

  it('shows the reviews-spread strip and the two tips', () => {
    renderWithIntl(<GrowthStages />);
    for (const text of [
      'Reviews spread out as a word grows',
      'Today',
      'Weeks later',
      'A water drop means: review it today',
      'Forgot one? That’s normal.',
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it('draws the memory chart: without review vs with Dygo, six reviews (canvas 2026-10-10)', () => {
    const { container } = renderWithIntl(<GrowthStages />);
    const chart = screen.getByRole('img', { name: /Memory of a word over a few weeks/ });
    expect(chart.querySelectorAll('circle')).toHaveLength(6);
    expect(container.textContent).toContain('With Dygo');
    expect(container.textContent).toContain('Without review');
  });

  it('shows each tip as a small garden picture: due words carry a drop, a forgotten word goes back to a sprout (canvas 2026-10-10)', () => {
    const { container } = renderWithIntl(<GrowthStages />);
    const drop = container.querySelector('[data-tip="drop"]')!;
    const forgot = container.querySelector('[data-tip="forgot"]')!;
    expect([...drop.querySelectorAll('[data-tile]')].map((t) => t.getAttribute('data-tile'))).toEqual(['drop', 'plain', 'drop']);
    expect([...forgot.querySelectorAll('[data-tile]')].map((t) => t.getAttribute('data-tile'))).toEqual(['forgot', 'drop', 'plain']);
    // The pictures repeat the text, so screen readers skip them.
    expect(drop.querySelector('[aria-hidden="true"] [data-tile]')).toBeTruthy();
    expect(drop.textContent).toContain('Dygo puts a water drop on it');
  });
});
