import { levelLabel, middleHalf, pickPackets, type PacketCandidate } from './beds.plan';

function bed(id: string, over: Partial<PacketCandidate> = {}): PacketCandidate {
  return {
    topic_id: id,
    title: id,
    collection: 'IELTS Academic',
    shelf: 'academic',
    word_count: 20,
    known_count: 0,
    level_low: 'B1',
    level_high: 'B2',
    fits_goal: false,
    ...over,
  };
}

const CTX = { level: 'B2', planted_shelves: ['academic'], current_shelf: 'academic' };

describe('pickPackets (S3 seed packets)', () => {
  it('picks Follow the bee, Same goal and Something new, one bed each, in that order', () => {
    const packets = pickPackets(
      [
        bed('urban', { fits_goal: true, word_count: 40 }),
        bed('climate', { known_count: 6, word_count: 32 }),
        bed('food', { shelf: 'general', collection: 'Everyday English', word_count: 28 }),
        bed('policy', { known_count: 2 }),
      ],
      CTX,
    );
    expect(packets.map((p) => [p.kind, p.topic_id])).toEqual([
      ['bee', 'climate'],
      ['goal', 'urban'],
      ['new', 'food'],
    ]);
  });

  it('never offers one bed twice: the bee wins a bed that also fits the goal', () => {
    const packets = pickPackets(
      [bed('a', { known_count: 3, fits_goal: true }), bed('b', { fits_goal: true, word_count: 5 })],
      CTX,
    );
    expect(packets.map((p) => [p.kind, p.topic_id])).toEqual([
      ['bee', 'a'],
      ['goal', 'b'],
    ]);
  });

  it('has no bee when no bed shares a word with the garden', () => {
    const packets = pickPackets(
      [bed('a', { fits_goal: true }), bed('b', { shelf: 'travel' })],
      CTX,
    );
    expect(packets.map((p) => p.kind)).toEqual(['goal', 'new']);
  });

  it('Same goal falls back to the shelf of the bed being left, biggest first', () => {
    const packets = pickPackets(
      [
        bed('small', { word_count: 8 }),
        bed('big', { word_count: 50 }),
        bed('other', { shelf: 'travel', word_count: 90 }),
      ],
      CTX,
    );
    expect(packets.find((p) => p.kind === 'goal')?.topic_id).toBe('big');
  });

  it('Something new prefers an unplanted shelf at the learner level', () => {
    const packets = pickPackets(
      [
        bed('hard', { shelf: 'work', level_low: 'C1', level_high: 'C2', word_count: 90 }),
        bed('fits', { shelf: 'travel', level_low: 'B1', level_high: 'B2', word_count: 10 }),
        bed('academic', { word_count: 99 }),
      ],
      { ...CTX, current_shelf: null },
    );
    expect(packets.find((p) => p.kind === 'new')?.topic_id).toBe('fits');
  });

  it('Something new falls back to any bed when every shelf is planted', () => {
    const packets = pickPackets([bed('a'), bed('b', { word_count: 30 })], {
      ...CTX,
      current_shelf: null,
    });
    expect(packets).toEqual([expect.objectContaining({ kind: 'new', topic_id: 'b' })]);
  });

  it('uses B1 when the learner level is unknown, and skips empty beds', () => {
    const packets = pickPackets(
      [
        bed('empty', { shelf: 'travel', word_count: 0 }),
        bed('b1', { shelf: 'travel', level_low: 'A2', level_high: 'B1' }),
        bed('c1', { shelf: 'travel', level_low: 'C1', level_high: 'C1', word_count: 99 }),
      ],
      { level: null, planted_shelves: [], current_shelf: null },
    );
    expect(packets).toEqual([expect.objectContaining({ kind: 'new', topic_id: 'b1' })]);
  });
});

describe('middleHalf and levelLabel (the packet level line)', () => {
  it('takes the 25th and 75th percentile level', () => {
    expect(middleHalf(['A2', 'B1', 'B1', 'B2', 'B2', 'B2', 'B2', 'C1'])).toEqual({
      level_low: 'B1',
      level_high: 'B2',
    });
    expect(middleHalf(['B2'])).toEqual({ level_low: 'B2', level_high: 'B2' });
    expect(middleHalf([])).toEqual({ level_low: null, level_high: null });
  });

  it('shows one level or a range with an en dash', () => {
    expect(levelLabel('B2', 'B2')).toBe('B2');
    expect(levelLabel('B1', 'B2')).toBe('B1–B2');
    expect(levelLabel(null, null)).toBeNull();
  });
});
