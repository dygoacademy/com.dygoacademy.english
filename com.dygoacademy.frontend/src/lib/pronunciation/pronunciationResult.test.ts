import { describe, expect, it } from 'vitest';

import {
  buildResultViewModel,
  CLOSE_BAND,
  overallScore,
  p4Ctas,
  PASS_MARK,
  resultDetail,
  resultKind,
  slashIpa,
  syllableStatus,
  toPronunciationResult,
  weakestIndex,
  type PronunciationResult,
} from './pronunciationResult';

const MITIGATE = [
  { text: 'mi', stressed: true, targetIpa: 'ˈmɪ' },
  { text: 'ti', stressed: false, targetIpa: 'tɪ' },
  { text: 'gate', stressed: false, targetIpa: 'ɡeɪt' },
];

function result(
  scores: number[],
  over: Partial<PronunciationResult> = {},
  heard: (string | null)[] = [],
): PronunciationResult {
  return {
    word: 'mitigate',
    syllables: MITIGATE.map((s, k) => ({ ...s, score: scores[k], heardIpa: heard[k] ?? null })),
    nativeAudioUrl: 'n.m4a',
    learnerAudioUrl: 'blob:me',
    round: { index: 0, total: 3, nextWord: 'deforestation' },
    ...over,
  };
}

describe('thresholds (plan §4)', () => {
  it('pass mark 80, close band 5', () => {
    expect(PASS_MARK).toBe(80);
    expect(CLOSE_BAND).toBe(5);
  });

  it('79 fail · 80 close · 84 close · 85 pass', () => {
    expect(syllableStatus(79)).toBe('fail');
    expect(syllableStatus(80)).toBe('close');
    expect(syllableStatus(84)).toBe('close');
    expect(syllableStatus(85)).toBe('pass');
    expect(syllableStatus(0)).toBe('fail');
    expect(syllableStatus(100)).toBe('pass');
  });

  it('resultKind: any fail = retry, else any close = almost perfect, else pass', () => {
    expect(resultKind([95, 79, 99])).toBe('retry');
    expect(resultKind([95, 84, 30])).toBe('retry');
    expect(resultKind([95, 80, 99])).toBe('almostPerfect');
    expect(resultKind([85, 85])).toBe('pass');
  });

  it('overall: the scorer’s word score, else the rounded mean', () => {
    expect(overallScore([95, 56, 94], 76.6)).toBe(77);
    expect(overallScore([95, 56, 94])).toBe(82);
    expect(overallScore([])).toBe(0);
  });

  it('weakest: the lowest, the first on a tie', () => {
    expect(weakestIndex([95, 56, 94])).toBe(1);
    expect(weakestIndex([82, 90, 82])).toBe(0);
    expect(weakestIndex([])).toBe(-1);
  });

  it('IPA between slashes, without stress marks', () => {
    expect(slashIpa('ˈseɪ')).toBe('/seɪ/');
    expect(slashIpa('/tɪ/')).toBe('/tɪ/');
  });
});

describe('the CTA matrix (plan §5)', () => {
  it('retry: Try again, then Skip (or Back to the bed on the last bee)', () => {
    expect(p4Ctas('retry', { last: false, nextWord: 'x' }, 'ti')).toEqual({
      main: { action: 'tryAgain', key: 'p4.cta.tryAgain' },
      link: { action: 'skip', key: 'p4.cta.skip' },
    });
    expect(p4Ctas('retry', { last: true }, 'ti').link.action).toBe('backToBed');
  });

  it('pass / almost: Next bee {next} or Back to the bed; Say it again or Polish {syl}', () => {
    expect(p4Ctas('pass', { last: false, nextWord: 'sunny' }, null)).toEqual({
      main: { action: 'nextBee', key: 'p4.cta.nextBee', values: { next: 'sunny' } },
      link: { action: 'sayAgain', key: 'p4.cta.sayAgain' },
    });
    expect(p4Ctas('almostPerfect', { last: false, nextWord: 'sunny' }, 'ti').link).toEqual({
      action: 'polish',
      key: 'p4.cta.polish',
      values: { syl: 'ti' },
    });
    expect(p4Ctas('pass', { last: true }, null).main.action).toBe('backToBed');
    expect(p4Ctas('almostPerfect', { last: true }, 'ti')).toMatchObject({
      main: { action: 'backToBed' },
      link: { action: 'polish' },
    });
  });
});

describe('buildResultViewModel', () => {
  it('pass: Hive full, nothing selected, All pass, green ring', () => {
    const r = result([95, 91, 94]);
    const vm = buildResultViewModel(r);
    expect(vm).toMatchObject({
      kind: 'pass',
      overall: 93,
      selected: -1,
      weak: -1,
      badge: { key: 'p4.badge.full', values: { n: 3 } },
      headline: { key: 'p4.head.pass' },
      sub: { key: 'p4.sub.pass', values: { word: 'mitigate' } },
      ringTone: 'ok',
      cta: { main: { action: 'nextBee' }, link: { action: 'sayAgain' } },
    });
    expect(vm.cells.map((c) => c.text)).toEqual(['MI', 'ti', 'gate']);
    expect(resultDetail(vm, r, vm.selected)).toEqual({
      tag: { key: 'p4.tag.all' },
      tone: 'all',
      text: { key: 'p4.detail.all', values: { mark: 80 } },
    });
  });

  it('almost: Hive full, the close cell selected, Polish', () => {
    const r = result([95, 82, 94]);
    const vm = buildResultViewModel(r);
    expect(vm).toMatchObject({ kind: 'almostPerfect', selected: 1, badge: { key: 'p4.badge.full' } });
    expect(vm.cta.link).toMatchObject({ action: 'polish', values: { syl: 'ti' } });
    expect(resultDetail(vm, r, 1)).toEqual({
      tag: { key: 'p4.tag.close' },
      tone: 'close',
      text: { key: 'p4.detail.close', values: { syl: 'ti', pct: 82, ipa: '/tɪ/' } },
    });
  });

  it('retry: Almost · k of n, the weakest selected, heard or cut short, amber ring', () => {
    const r = result([95, 56, 94], {}, [null, 'taɪ', null]);
    const vm = buildResultViewModel(r);
    expect(vm).toMatchObject({
      kind: 'retry',
      overall: 82,
      selected: 1,
      badge: { key: 'p4.badge.almost', values: { k: 2, n: 3 } },
      headline: { key: 'p4.head.retry' },
      ringTone: 'retry',
      cta: { main: { action: 'tryAgain' }, link: { action: 'skip' } },
    });
    expect(resultDetail(vm, r, 1).text).toEqual({
      key: 'p4.detail.fail',
      values: { syl: 'ti', pct: 56, heard: '/taɪ/', ipa: '/tɪ/' },
    });
    expect(resultDetail(vm, r, 0)).toEqual({
      tag: { key: 'p4.tag.pass' },
      tone: 'pass',
      text: { key: 'p4.detail.ok', values: { syl: 'MI', pct: 95 } },
    });
    const cut = result([95, 41, 94]);
    expect(resultDetail(buildResultViewModel(cut), cut, 1).text.key).toBe('p4.detail.cut');
  });

  it('the sub line never carries a score', () => {
    for (const s of [
      [95, 91, 94],
      [95, 82, 94],
      [95, 56, 94],
    ]) {
      const vm = buildResultViewModel(result(s));
      expect(Object.keys(vm.sub.values ?? {})).toEqual(['word']);
    }
  });

  it('the last bee: Back to the bed', () => {
    const vm = buildResultViewModel(result([95, 91, 94], { round: { index: 2, total: 3 } }));
    expect(vm.cta.main.action).toBe('backToBed');
  });

  it('cell labels name the score and the line', () => {
    const vm = buildResultViewModel(result([95, 56, 82]));
    expect(vm.cells.map((c) => c.aria.key)).toEqual([
      'p4.cellAria.pass',
      'p4.cellAria.fail',
      'p4.cellAria.close',
    ]);
    expect(vm.cells[1].aria.values).toEqual({ syl: 'ti', pct: 56 });
  });
});

describe('toPronunciationResult', () => {
  const stones = MITIGATE.map(({ text, stressed }) => ({ text, stressed }));
  const check = {
    total: 82,
    syllables: [
      { ipa: 'ˈmɪ', score: 95, wobbly: false, heard_ipa: null, start_ms: 90, end_ms: 220 },
      { ipa: 'tɪ', score: 55.6, wobbly: true, heard_ipa: 'taɪ', start_ms: 220, end_ms: 380 },
      { ipa: 'ɡeɪt', score: 94, wobbly: false, heard_ipa: null },
    ],
  };

  it('matches the scorer’s syllables to the stones by position', () => {
    const r = toPronunciationResult({
      word: 'mitigate',
      stones,
      check,
      nativeAudioUrl: 'n.m4a',
      learnerAudioUrl: 'blob:me',
      round: { index: 0, total: 1 },
    });
    expect(r?.syllables).toEqual([
      { text: 'mi', stressed: true, score: 95, heardIpa: null, targetIpa: 'ˈmɪ', startMs: 90, endMs: 220 },
      { text: 'ti', stressed: false, score: 56, heardIpa: 'taɪ', targetIpa: 'tɪ', startMs: 220, endMs: 380 },
      { text: 'gate', stressed: false, score: 94, heardIpa: null, targetIpa: 'ɡeɪt' },
    ]);
    expect(r?.overallScore).toBe(82);
  });

  it('null when the scorer split the word another way', () => {
    expect(
      toPronunciationResult({
        word: 'mitigate',
        stones: stones.slice(0, 2),
        check,
        nativeAudioUrl: 'n',
        learnerAudioUrl: 'b',
        round: { index: 0, total: 1 },
      }),
    ).toBeNull();
  });
});
