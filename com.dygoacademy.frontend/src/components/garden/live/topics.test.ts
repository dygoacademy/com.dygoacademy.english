import { describe, expect, it } from 'vitest';

import { leadingStage } from '../screens/TopicsScreen';
import { sortBedsByDue, toScreenTopic } from './data';

const base = {
  id: 't1',
  group_id: 'g1',
  title: 'Environment',
  description: null,
  is_public: false,
  word_count: '48',
  mastered_count: '18',
  focus_word_count: '2',
  created_at: '',
};

describe('A6 live mapping', () => {
  it('uses the UI-5 fields when the API sends them', () => {
    const topic = toScreenTopic(
      {
        ...base,
        seed_count: '12',
        sprout_count: '11',
        flower_count: '7',
        due_count: '6',
        min_level: 'B2',
        max_level: 'C1',
        kind: 'library',
        collection_title: 'IELTS Academic',
      },
      'Library',
    );
    expect(topic).toMatchObject({
      group: 'library:IELTS Academic',
      level: 'B2–C1',
      words: 48,
      stages: { tree: 18, flower: 7, sprout: 11, seed: 12 },
      due: 6,
    });
  });

  it('falls back honestly on an older API', () => {
    const topic = toScreenTopic({ ...base, mastered_count: '0' }, 'Library');
    expect(topic).toMatchObject({ group: 'all', level: null, stages: null, due: null });
    // No stage data and nothing mastered: a sprout, never a fruit tree.
    expect(leadingStage(topic.stages, topic.words)).toBe('sprout');
  });
});

describe('leadingStage', () => {
  it('picks the largest stage, ties to the more grown one', () => {
    expect(leadingStage({ tree: 18, flower: 7, sprout: 11 }, 48)).toBe('tree');
    expect(leadingStage({ tree: 8, flower: 6, sprout: 12 }, 36)).toBe('sprout');
    expect(leadingStage({ tree: 5, flower: 5, sprout: 1 }, 11)).toBe('tree');
  });

  it('shows a seed for empty or unreviewed beds, never a tree for 0 fruiting', () => {
    expect(leadingStage({ tree: 0, flower: 0, sprout: 0, seed: 6 }, 6)).toBe('seed');
    expect(leadingStage({ tree: 0, flower: 0, sprout: 0, seed: 0 }, 3)).toBe('seed');
    expect(leadingStage({ tree: 0, flower: 0, sprout: 0 }, 6)).toBe('sprout');
    expect(leadingStage(null, 0)).toBe('seed');
  });
});

describe('sortBedsByDue', () => {
  it('puts the most due first and keeps API order for ties and unknowns', () => {
    const beds = [
      { id: 'a', due: 0 },
      { id: 'b', due: null },
      { id: 'c', due: 6 },
      { id: 'd', due: 2 },
      { id: 'e', due: 6 },
    ];
    expect(sortBedsByDue(beds).map((bed) => bed.id)).toEqual(['c', 'e', 'd', 'a', 'b']);
    expect(beds[0].id).toBe('a');
  });
});
