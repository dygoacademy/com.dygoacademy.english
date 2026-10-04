import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { ReviewCard } from './ReviewCard';

const base = { word: 'mitigate', meaning: 'to make less severe', audioSrc: null };

describe('ReviewCard "Say this one?" (Phase 13 T9-a)', () => {
  it('shows the offer only after the flip', () => {
    const onClick = vi.fn();
    const { rerender } = renderWithIntl(
      <ReviewCard {...base} revealed={false} speakOffer={{ label: 'Say this one?', onClick }} />,
    );
    expect(screen.queryByRole('button', { name: 'Say this one?' })).toBeNull();
    rerender(<ReviewCard {...base} revealed speakOffer={{ label: 'Say this one?', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Say this one?' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('has no offer without one', () => {
    renderWithIntl(<ReviewCard {...base} revealed />);
    expect(screen.queryByRole('button', { name: 'Say this one?' })).toBeNull();
  });
});
