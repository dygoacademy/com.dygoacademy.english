import { describe, expect, it } from 'vitest';

import { toBedWords, type GardenTopicWord } from './data';

const NOW = new Date(2026, 8, 27, 10, 0, 0);
const at = (days: number, hours = 0) =>
  new Date(NOW.getTime() + days * 86_400_000 + hours * 3_600_000).toISOString();

function word(id: string, srs: Partial<GardenTopicWord> = {}): GardenTopicWord {
  return {
    id,
    source_word: id,
    language_code: 'en',
    status: 'READY',
    custom_note: null,
    failure_reason: null,
    created_at: '',
    fsrs_state: null,
    mastered_at: null,
    is_leech: null,
    next_due_at: null,
    ...srs,
  } as GardenTopicWord;
}

const BED = [
  word('later9', { fsrs_state: 'Review', mastered_at: at(-30), next_due_at: at(9) }),
  word('seed'),
  word('later3', { fsrs_state: 'Review', next_due_at: at(3) }),
  word('dueNow', { fsrs_state: 'Learning', next_due_at: at(0, -1) }),
  word('leech', { fsrs_state: 'Relearning', is_leech: true, next_due_at: at(0, -2) }),
  word('overdue', { fsrs_state: 'Review', next_due_at: at(-2) }),
  word('newRow', { fsrs_state: 'New', next_due_at: at(0, -5) }),
];

describe('A7 live mapping (U5-3)', () => {
  it('maps SRS state to stages and counts every word in one tile', () => {
    const { words, stageCounts } = toBedWords(BED, new Map(), NOW);
    const stage = Object.fromEntries(words.map((w) => [w.id, w.stage]));
    expect(stage).toMatchObject({
      later9: 'tree',
      seed: 'seed',
      newRow: 'seed',
      later3: 'flower',
      dueNow: 'sprout',
      leech: 'sprout',
      overdue: 'flower',
    });
    expect(stageCounts).toEqual({ seed: 2, sprout: 2, flower: 2, tree: 1 });
    expect(words.find((w) => w.id === 'leech')?.wilting).toBe(true);
    expect(words.find((w) => w.id === 'dueNow')?.wilting).toBe(false);
  });

  it('sorts by next watering: wilting due, due (longest overdue first), new, then soonest', () => {
    const { words } = toBedWords(BED, new Map(), NOW);
    expect(words.map((w) => w.id)).toEqual([
      'leech',
      'overdue',
      'dueNow',
      'seed',
      'newRow',
      'later3',
      'later9',
    ]);
  });

  it('labels due now, new and whole days until the next watering', () => {
    const { words } = toBedWords(BED, new Map(), NOW);
    const due = Object.fromEntries(words.map((w) => [w.id, w.due]));
    expect(due.overdue).toEqual({ tone: 'now' });
    expect(due.seed).toEqual({ tone: 'new' });
    expect(due.newRow).toEqual({ tone: 'new' });
    expect(due.later3).toEqual({ tone: 'later', days: 3 });
    expect(due.later9).toEqual({ tone: 'later', days: 9 });
  });

  it('never says "in 0 days" for a word due later today', () => {
    const { words } = toBedWords(
      [word('tonight', { fsrs_state: 'Review', next_due_at: at(0, 1) })],
      new Map(),
      NOW,
    );
    expect(words[0].due).toEqual({ tone: 'later', days: 1 });
  });

  it('takes meanings from the due cards, else the custom note', () => {
    const { words } = toBedWords(
      [word('a'), word('b', { custom_note: 'note' } as Partial<GardenTopicWord>)],
      new Map([['a', { text: 'meaning a', lang: 'en' }]]),
      NOW,
    );
    expect(words.map((w) => w.meaning)).toEqual(['meaning a', 'note']);
  });

  it('carries the meaning\'s lang through to meaningLang, for a translated meaning', () => {
    const { words } = toBedWords(
      [word('a')],
      new Map([['a', { text: 'buổi sáng', lang: 'vi' }]]),
      NOW,
    );
    expect(words[0].meaningLang).toBe('vi');
  });

  it('leaves the tiles at "—" when the API has no per-word SRS fields', () => {
    const old = BED.map((w) => {
      const copy: Partial<GardenTopicWord> = { ...w };
      delete copy.fsrs_state;
      delete copy.mastered_at;
      delete copy.is_leech;
      delete copy.next_due_at;
      return copy as GardenTopicWord;
    });
    const { words, stageCounts } = toBedWords(old, new Map(), NOW);
    expect(stageCounts).toBeNull();
    expect(words).toHaveLength(BED.length);
  });

  it('gives an empty bed zero counts', () => {
    expect(toBedWords([], new Map(), NOW).stageCounts).toEqual({
      seed: 0,
      sprout: 0,
      flower: 0,
      tree: 0,
    });
  });
});
