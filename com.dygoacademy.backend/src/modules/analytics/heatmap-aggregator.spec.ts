import { HeatmapEntry, WordAttemptCounts, rankHeatmap } from './heatmap-aggregator';

function makeWord(overrides: Partial<WordAttemptCounts> = {}): WordAttemptCounts {
  return {
    topic_word_id: 'tw-1',
    source_word: 'resilient',
    topic_id: 'topic-1',
    topic_title: 'Unit 1',
    attempts: 10,
    failures: 5,
    ...overrides,
  };
}

describe('rankHeatmap', () => {
  it('computes failure_rate as failures / attempts', () => {
    const [entry] = rankHeatmap([makeWord({ attempts: 8, failures: 6 })]);

    expect(entry.failure_rate).toBe(0.75);
  });

  it('rounds failure_rate to 4 decimal places rather than leaving a repeating fraction', () => {
    const [entry] = rankHeatmap([makeWord({ attempts: 3, failures: 1 })]);

    expect(entry.failure_rate).toBe(0.3333);
  });

  it('sorts worst-first by failure_rate descending', () => {
    const rows = [
      makeWord({ topic_word_id: 'low', attempts: 10, failures: 1 }), // 0.1
      makeWord({ topic_word_id: 'high', attempts: 10, failures: 9 }), // 0.9
      makeWord({ topic_word_id: 'mid', attempts: 10, failures: 5 }), // 0.5
    ];

    const result = rankHeatmap(rows);

    expect(result.map((r) => r.topic_word_id)).toEqual(['high', 'mid', 'low']);
  });

  it('breaks a failure_rate tie by attempts descending — more evidence ranks first', () => {
    const rows = [
      makeWord({ topic_word_id: 'small-sample', attempts: 1, failures: 1 }), // 1.0, 1 attempt
      makeWord({ topic_word_id: 'big-sample', attempts: 50, failures: 50 }), // 1.0, 50 attempts
    ];

    const result = rankHeatmap(rows);

    expect(result.map((r) => r.topic_word_id)).toEqual(['big-sample', 'small-sample']);
  });

  it('caps the result to the given limit, keeping only the worst N', () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      makeWord({ topic_word_id: `w${i}`, attempts: 10, failures: i % 10 }),
    );

    const result = rankHeatmap(rows, 5);

    expect(result).toHaveLength(5);
  });

  it('defaults the limit to 20 when none is given', () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      makeWord({ topic_word_id: `w${i}`, attempts: 10, failures: 1 }),
    );

    const result = rankHeatmap(rows);

    expect(result).toHaveLength(20);
  });

  it('returns an empty array for an empty input, not an error', () => {
    expect(rankHeatmap([])).toEqual([]);
  });

  it('treats a negative or fractional limit safely — floors to a non-negative integer', () => {
    const rows = [makeWord()];

    expect(rankHeatmap(rows, -5)).toEqual([]);
    expect(rankHeatmap(rows, 1.9)).toHaveLength(1);
  });

  it('never mutates the input rows', () => {
    const rows = [makeWord()];
    const snapshot = JSON.parse(JSON.stringify(rows));

    rankHeatmap(rows);

    expect(rows).toEqual(snapshot);
  });

  it('does not include fields beyond WordAttemptCounts plus failure_rate', () => {
    const [entry]: HeatmapEntry[] = rankHeatmap([makeWord()]);

    expect(Object.keys(entry).sort()).toEqual(
      [
        'attempts',
        'failure_rate',
        'failures',
        'source_word',
        'topic_id',
        'topic_title',
        'topic_word_id',
      ].sort(),
    );
  });
});
