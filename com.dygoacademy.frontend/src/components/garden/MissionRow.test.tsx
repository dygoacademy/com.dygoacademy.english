import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { MissionRow } from './MissionRow';

describe('MissionRow', () => {
  it('exposes progress with a text equivalent', () => {
    renderWithIntl(
      <MissionRow
        icon={null}
        title="Water 18 words"
        value={12}
        max={18}
        valueLabel="12/18"
        progressText="12 of 18 words watered"
        status="inProgress"
      />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('12');
    expect(bar.getAttribute('aria-valuemax')).toBe('18');
    expect(bar.getAttribute('aria-valuetext')).toBe('12 of 18 words watered');
    expect(screen.getByText(/In progress/)).toBeTruthy();
  });

  it('says "Done" in words, not only with a strike-through', () => {
    renderWithIntl(
      <MissionRow
        icon={null}
        title="Plant 3 new words"
        value={3}
        max={3}
        valueLabel="3/3"
        progressText="3 of 3 words planted"
        status="done"
      />,
    );
    expect(screen.getByText(/Done/)).toBeTruthy();
  });
});
