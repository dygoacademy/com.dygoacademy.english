/**
 * "Say this one?" on the review card: which cards get the offer (notes
 * §14, rule T9-a). Chosen once when the session's cards load, so the
 * offers don't depend on how the learner rates.
 */
import type { DueCard, SpeakingWordLookup } from '@/types';

import { SPEAK_OFFERS_PER_SESSION } from './constants';

type OfferCard = Pick<DueCard, 'topic_word_id' | 'is_new' | 'state' | 'lapses'>;

/** 0 = new word, 1 = forgotten (relearning or lapsed), 2 = the rest. */
function rank(card: OfferCard): number {
  if (card.is_new) return 0;
  if (card.state === 'Relearning' || card.lapses > 0) return 1;
  return 2;
}

/**
 * Eligible: the card's word has a speaking item not spoken today. Then new
 * words first, then forgotten ones, then the rest; ties keep queue order.
 * At most SPEAK_OFFERS_PER_SESSION topic_word_ids.
 */
export function pickSpeakOffers(
  cards: readonly OfferCard[],
  lookup: readonly SpeakingWordLookup[],
  max: number = SPEAK_OFFERS_PER_SESSION,
): string[] {
  const usable = new Set(lookup.filter((l) => !l.spoken_today).map((l) => l.topic_word_id));
  return cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => usable.has(card.topic_word_id))
    .sort((a, b) => rank(a.card) - rank(b.card) || a.index - b.index)
    .slice(0, max)
    .map(({ card }) => card.topic_word_id);
}
