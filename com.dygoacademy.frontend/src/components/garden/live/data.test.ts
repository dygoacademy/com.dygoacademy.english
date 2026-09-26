import { describe, expect, it } from 'vitest';

import { displayName, greetingFor, missedDays, sampleGarden, weekOf } from './data';

describe('live garden helpers', () => {
  it('greets by time of day', () => {
    expect(greetingFor(8)).toBe('morning');
    expect(greetingFor(13)).toBe('afternoon');
    expect(greetingFor(21)).toBe('evening');
  });

  it('counts missed days from real activity', () => {
    const rows = (dates: string[]) =>
      dates.map((review_date) => ({ review_date, review_count: 3 }));
    expect(missedDays([], '2026-09-28')).toBeNull();
    expect(missedDays([{ review_date: '2026-09-20', review_count: 0 }], '2026-09-28')).toBeNull();
    expect(missedDays(rows(['2026-09-28']), '2026-09-28')).toBe(0);
    expect(missedDays(rows(['2026-09-27']), '2026-09-28')).toBe(0);
    expect(missedDays(rows(['2026-09-26']), '2026-09-28')).toBe(1);
    expect(missedDays(rows(['2026-09-20', '2026-09-25']), '2026-09-28')).toBe(2);
  });

  it('draws a garden that follows the counts', () => {
    const plants = sampleGarden({ total: 100, mastered: 50, leeches: 10, due: 20 }, 9);
    expect(plants).toHaveLength(9);
    const stages = plants.map((p) => (typeof p === 'string' ? p : p.stage));
    expect(stages.filter((s) => s === 'tree')).toHaveLength(5);
    expect(stages.filter((s) => s === 'wilting')).toHaveLength(1);
    expect(sampleGarden({ total: 0, mastered: 0, leeches: 0, due: 0 }, 3)).toEqual([
      'seed',
      'seed',
      'seed',
    ]);
  });

  it('builds a Monday-first week', () => {
    const days = weekOf(new Date(2026, 8, 25)); // Friday 25 Sep 2026
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[0].getDate()).toBe(21);
    expect(days[6].getDate()).toBe(27);
  });

  it('finds a first name to greet with', () => {
    expect(displayName({ user_metadata: { full_name: 'Minh Tran' } })).toBe('Minh');
    expect(displayName({ user_metadata: {} })).toBeNull();
    expect(displayName(null)).toBeNull();
  });
});

describe('topics helpers', () => {
  it('formats the CEFR range', async () => {
    const { formatLevel } = await import('./data');
    expect(formatLevel('B2', 'C1')).toBe('B2–C1');
    expect(formatLevel('B2', 'B2')).toBe('B2');
    expect(formatLevel(null, null)).toBeNull();
  });

  it('builds chips from the kinds present, collections first', async () => {
    const { topicFilters } = await import('./data');
    const labels = { mine: 'Mine', group: 'Group' };
    expect(
      topicFilters(
        [{ group: 'group' }, { group: 'library:IELTS Academic' }, { group: 'mine' }],
        labels,
      ),
    ).toEqual([
      { id: 'library:IELTS Academic', label: 'IELTS Academic' },
      { id: 'mine', label: 'Mine' },
      { id: 'group', label: 'Group' },
    ]);
    expect(topicFilters([{ group: 'mine' }], labels)).toEqual([{ id: 'mine', label: 'Mine' }]);
  });
});
