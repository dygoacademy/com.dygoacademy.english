import { describe, expect, it } from 'vitest';

import { pickSpeakOffers } from './offers';

const card = (
  id: string,
  over: Partial<{
    is_new: boolean;
    state: 'New' | 'Learning' | 'Review' | 'Relearning';
    lapses: number;
  }> = {},
) => ({
  topic_word_id: id,
  is_new: false,
  state: 'Review' as const,
  lapses: 0,
  ...over,
});
const item = (id: string, spoken_today = false) => ({
  topic_word_id: id,
  item_id: `i-${id}`,
  spoken_today,
});

describe('pickSpeakOffers (T9-a)', () => {
  it('only cards with an item not spoken today', () => {
    const cards = [card('a'), card('b'), card('c')];
    expect(pickSpeakOffers(cards, [item('a', true), item('c')])).toEqual(['c']);
    expect(pickSpeakOffers(cards, [])).toEqual([]);
  });

  it('new first, then forgotten (relearning or lapsed), then the rest, in queue order', () => {
    const cards = [
      card('review1'),
      card('lapsed', { lapses: 2 }),
      card('new1', { is_new: true, state: 'New' }),
      card('relearn', { state: 'Relearning' }),
      card('new2', { is_new: true, state: 'New' }),
    ];
    const all = cards.map((c) => item(c.topic_word_id));
    expect(pickSpeakOffers(cards, all, 10)).toEqual([
      'new1',
      'new2',
      'lapsed',
      'relearn',
      'review1',
    ]);
  });

  it('takes at most 3', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => card(id));
    expect(
      pickSpeakOffers(
        cards,
        cards.map((c) => item(c.topic_word_id)),
      ),
    ).toEqual(['a', 'b', 'c']);
  });
});
