import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { HARVEST } from './fixtures';
import { WeeklyHarvestScreen } from './WeeklyHarvestScreen';

describe('Sound Garden card on the Missions tab (Phase 13 S10)', () => {
  it('links to The Pond and says how many sentences are ready', () => {
    renderWithIntl(
      <WeeklyHarvestScreen {...HARVEST} soundGarden={{ itemCount: 38, href: '/sounds' }} />,
    );
    const card = screen.getByTestId('sound-garden-card');
    expect(card.getAttribute('href')).toBe('/sounds');
    expect(card.textContent).toContain('Sound Garden');
    expect(card.textContent).toContain('The Pond · 38 sentences ready');
  });

  it('is absent without speaking items (and on the canvas reference)', () => {
    renderWithIntl(<WeeklyHarvestScreen {...HARVEST} soundGarden={null} />);
    expect(screen.queryByTestId('sound-garden-card')).toBeNull();
    renderWithIntl(<WeeklyHarvestScreen {...HARVEST} />);
    expect(screen.queryByTestId('sound-garden-card')).toBeNull();
  });
});
