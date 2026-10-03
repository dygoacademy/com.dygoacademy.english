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
      'A water drop means it’s due today',
      'Forgot one? No problem.',
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });
});
