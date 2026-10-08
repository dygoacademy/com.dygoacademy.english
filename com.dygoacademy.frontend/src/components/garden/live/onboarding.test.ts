import { describe, expect, it } from 'vitest';

import { seedPackets, MAX_PACKETS } from './OnboardBedLive';
import type { GardenTopicSummary } from './data';
import {
  arcFraction,
  arcPoint,
  clockToHhmm,
  formatBand,
  hasBand,
  initialBand,
  minutesToClock,
  partOfDay,
  pointToClock,
  stepBand,
} from './onboarding';

describe('OB2 target band helpers', () => {
  it('only IELTS and PTE have a band', () => {
    expect(hasBand('IELTS')).toBe(true);
    expect(hasBand('PTE')).toBe(true);
    expect(hasBand('LIFE')).toBe(false);
    expect(hasBand(null)).toBe(false);
  });

  it('starts from the saved band when it fits, else the default', () => {
    expect(initialBand('IELTS', 6.5)).toBe(6.5);
    expect(initialBand('IELTS', null)).toBe(7);
    expect(initialBand('IELTS', 65)).toBe(7);
    expect(initialBand('PTE', 79)).toBe(79);
    expect(initialBand('PTE', 7)).toBe(65);
  });

  it('steps IELTS by half bands and PTE by 5, inside the range', () => {
    expect(stepBand('IELTS', 7, 1)).toBe(7.5);
    expect(stepBand('IELTS', 7, -1)).toBe(6.5);
    expect(stepBand('IELTS', 9, 1)).toBe(9);
    expect(stepBand('IELTS', 4, -1)).toBe(4);
    expect(stepBand('PTE', 65, 1)).toBe(70);
    expect(stepBand('PTE', 90, 1)).toBe(90);
    expect(stepBand('PTE', 30, -1)).toBe(30);
    // A saved PTE score off the 5-grid snaps onto it.
    expect(stepBand('PTE', 79, 1)).toBe(85);
  });

  it('writes IELTS bands with one decimal', () => {
    expect(formatBand('IELTS', 7)).toBe('7.0');
    expect(formatBand('IELTS', 6.5)).toBe('6.5');
    expect(formatBand('PTE', 65)).toBe('65');
  });
});

describe('OB4 sun arc helpers', () => {
  it('snaps to quarter hours and keeps the time on the arc (06:00–23:00)', () => {
    expect(minutesToClock(7 * 60 + 37)).toEqual({ hour: 7, minute: 30 });
    expect(minutesToClock(7 * 60 + 38)).toEqual({ hour: 7, minute: 45 });
    expect(minutesToClock(60)).toEqual({ hour: 6, minute: 0 });
    expect(minutesToClock(24 * 60)).toEqual({ hour: 23, minute: 0 });
  });

  it('puts 06:00 at the left end, 14:30 at the top and 23:00 at the right end', () => {
    expect(arcFraction({ hour: 6, minute: 0 })).toBe(0);
    expect(arcFraction({ hour: 14, minute: 30 })).toBe(0.5);
    expect(arcFraction({ hour: 23, minute: 0 })).toBe(1);
    const left = arcPoint(0, 160, 150, 128);
    const top = arcPoint(0.5, 160, 150, 128);
    const right = arcPoint(1, 160, 150, 128);
    expect(left.x).toBeCloseTo(32);
    expect(left.y).toBeCloseTo(150);
    expect(top.x).toBeCloseTo(160);
    expect(top.y).toBeCloseTo(22);
    expect(right.x).toBeCloseTo(288);
  });

  it('turns a pointer position back into the time under it', () => {
    for (const time of [
      { hour: 7, minute: 30 },
      { hour: 12, minute: 0 },
      { hour: 19, minute: 15 },
    ]) {
      const point = arcPoint(arcFraction(time), 160, 150, 128);
      expect(pointToClock(point.x, point.y, 160, 150)).toEqual(time);
    }
    // Below the ground line counts as the nearer end.
    expect(pointToClock(10, 170, 160, 150)).toEqual({ hour: 6, minute: 0 });
    expect(pointToClock(310, 170, 160, 150)).toEqual({ hour: 23, minute: 0 });
  });

  it('formats the schedule time and names the part of the day', () => {
    expect(clockToHhmm({ hour: 7, minute: 5 })).toBe('07:05');
    expect(partOfDay({ hour: 7, minute: 30 })).toBe('morning');
    expect(partOfDay({ hour: 12, minute: 30 })).toBe('day');
    expect(partOfDay({ hour: 19, minute: 0 })).toBe('evening');
    expect(partOfDay({ hour: 21, minute: 30 })).toBe('night');
  });
});

describe('OB3 seedPackets', () => {
  const topic = (over: Partial<GardenTopicSummary>): GardenTopicSummary => ({
    id: 'x',
    group_id: 'g',
    title: 'T',
    description: null,
    is_public: true,
    word_count: '10',
    mastered_count: '0',
    focus_word_count: '0',
    created_at: '2026-10-01',
    ...over,
  });

  it('leaves out empty beds, puts library collections first, then the biggest', () => {
    const packets = seedPackets([
      topic({ id: 'mine', kind: 'mine', word_count: '50' }),
      topic({ id: 'empty', kind: 'library', word_count: '0' }),
      topic({ id: 'small', kind: 'library', word_count: '12', min_level: 'B1', max_level: 'B2' }),
      topic({ id: 'big', kind: 'library', word_count: '60', min_level: 'C1', max_level: 'C1' }),
    ]);
    expect(packets.map((packet) => packet.id)).toEqual(['big', 'small', 'mine']);
    expect(packets[0]).toEqual({ id: 'big', title: 'T', words: 60, level: 'C1' });
    expect(packets[1].level).toBe('B1–B2');
    expect(packets[2].level).toBeNull();
  });

  it(`shows at most ${MAX_PACKETS} packets`, () => {
    const many = Array.from({ length: 12 }, (_, i) => topic({ id: `t${i}` }));
    expect(seedPackets(many)).toHaveLength(MAX_PACKETS);
  });
});
