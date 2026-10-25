import { describe, expect, it } from 'vitest';

import { cellsReached, syllableSlots } from './liveFill';
import { mockKind, mockWordCheck } from './mock';
import { buildResultViewModel, toPronunciationResult } from './pronunciationResult';
import { p1Tip } from './tip';

const syl = (text: string, stressed = false) => ({ text, stressed });

describe('p1Tip: built from the syllables', () => {
  it('3 syllables, stress first: MI loud, ti light, then gate', () => {
    expect(p1Tip([syl('mi', true), syl('ti'), syl('gate')])).toEqual({
      key: 'p1.tip',
      values: { loud: 'MI', light: 'ti', rest: 'gate' },
    });
  });

  it('2 syllables: SUN loud, then ny light', () => {
    expect(p1Tip([syl('sun', true), syl('ny')])).toEqual({
      key: 'p1.tipTwo',
      values: { loud: 'SUN', light: 'ny' },
    });
  });

  it('4 syllables, stress third: com pen light, SA loud, then tion', () => {
    expect(p1Tip([syl('com'), syl('pen'), syl('sa', true), syl('tion')])).toEqual({
      key: 'p1.tipLate',
      values: { loud: 'SA', light: 'com pen', rest: 'tion' },
    });
  });

  it('stress last, one syllable, none stressed', () => {
    expect(p1Tip([syl('be'), syl('gin', true)])).toEqual({
      key: 'p1.tipLateEnd',
      values: { loud: 'GIN', light: 'be' },
    });
    expect(p1Tip([syl('sun', true)])).toEqual({ key: 'p1.tipOne', values: { loud: 'SUN' } });
    expect(p1Tip([syl('a'), syl('b')]).values).toMatchObject({ loud: 'a', light: 'b' });
  });
});

describe('live fill: voiced time on syllable slots', () => {
  const timed = [
    { start_ms: 100, end_ms: 300 },
    { start_ms: 300, end_ms: 420 },
    { start_ms: 420, end_ms: 800 },
  ];

  it('slots from the native syllable spans, from the word’s start', () => {
    expect(syllableSlots(timed)).toEqual([
      { startMs: 0, endMs: 200 },
      { startMs: 200, endMs: 320 },
      { startMs: 320, endMs: 700 },
    ]);
  });

  it('equal slots without spans: over the native length, else 250 ms each', () => {
    const none = [{ start_ms: null, end_ms: null }, { start_ms: 1, end_ms: null }];
    expect(syllableSlots(none, 600)).toEqual([
      { startMs: 0, endMs: 300 },
      { startMs: 300, endMs: 600 },
    ]);
    expect(syllableSlots(none)).toEqual([
      { startMs: 0, endMs: 250 },
      { startMs: 250, endMs: 500 },
    ]);
  });

  it('a cell is reached once the voice passes its slot’s start', () => {
    const slots = syllableSlots(timed);
    expect(cellsReached(0, slots)).toBe(0);
    expect(cellsReached(10, slots)).toBe(1);
    expect(cellsReached(199, slots)).toBe(1);
    expect(cellsReached(200, slots)).toBe(2);
    expect(cellsReached(330, slots)).toBe(3);
    expect(cellsReached(5000, slots)).toBe(3);
    expect(cellsReached(100, [])).toBe(0);
  });
});

describe('mock scorer (NEXT_PUBLIC_PRON_MOCK)', () => {
  const stones = [syl('com'), syl('pen'), syl('sa', true), syl('tion')];

  it('walks retry → almost → pass', () => {
    expect([0, 1, 2, 5].map(mockKind)).toEqual(['retry', 'almostPerfect', 'pass', 'pass']);
  });

  it('gives the plan’s scores, which the view model reads as the plan says', () => {
    for (const [kind, scores] of [
      ['retry', [93, 90, 56, 95]],
      ['almostPerfect', [93, 90, 82, 95]],
      ['pass', [93, 90, 92, 95]],
    ] as const) {
      const check = mockWordCheck('compensation', stones, kind);
      expect(check.syllables.map((s) => s.score)).toEqual(scores);
      const r = toPronunciationResult({
        word: 'compensation',
        stones,
        check,
        nativeAudioUrl: 'n',
        learnerAudioUrl: 'b',
        round: { index: 0, total: 1 },
      });
      expect(buildResultViewModel(r!).kind).toBe(kind);
    }
    expect(mockWordCheck('compensation', stones, 'retry').syllables[2].heard_ipa).toBe('sæ');
    expect(mockWordCheck('cloudy', [syl('clou', true), syl('dy')], 'retry').syllables[1]).toMatchObject({
      score: 41,
      heard_ipa: null,
    });
  });

  it('other words: a weak unstressed syllable', () => {
    const check = mockWordCheck('ecosystem', [syl('e', true), syl('co'), syl('sys'), syl('tem')], 'retry');
    expect(check.syllables.map((s) => s.score)).toEqual([92, 91, 90, 56]);
  });
});
