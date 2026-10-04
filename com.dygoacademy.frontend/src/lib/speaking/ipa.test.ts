import { describe, expect, it } from 'vitest';

import {
  ipaCore,
  ipaSegments,
  spellingSegments,
  stressedSpelling,
  stressedSyllable,
  syllableAt,
} from './ipa';

describe('ipa helpers', () => {
  it('splits on dots and stress marks, keeping the marks in the shown text', () => {
    expect(ipaSegments('/ˈmɪt.ɪ.ɡeɪt/')).toEqual([
      { text: 'ˈmɪt', syllable: 'mɪt', stressed: true },
      { text: '.ɪ', syllable: 'ɪ', stressed: false },
      { text: '.ɡeɪt', syllable: 'ɡeɪt', stressed: false },
    ]);
    const bio = ipaSegments('/ˌbaɪ.oʊ.daɪˈvɜːr.sə.ti/');
    expect(bio.map((s) => s.syllable)).toEqual(['baɪ', 'oʊ', 'daɪ', 'vɜːr', 'sə', 'ti']);
    expect(bio.map((s) => s.stressed)).toEqual([false, false, false, true, false, false]);
    expect(bio.map((s) => s.text).join('')).toBe('ˌbaɪ.oʊ.daɪˈvɜːr.sə.ti');
  });

  it('finds the stressed syllable and a syllable by index', () => {
    expect(stressedSyllable('/ˈmɪt.ɪ.ɡeɪt/')).toBe('mɪt');
    expect(stressedSyllable('/draʊt/')).toBe('draʊt');
    expect(stressedSyllable(null)).toBeNull();
    expect(syllableAt('/ˌbaɪ.oʊ.daɪˈvɜːr.sə.ti/', 3)).toBe('vɜːr');
    expect(syllableAt('/draʊt/', 4)).toBeNull();
  });

  it('uses the first transcription and the first word of a phrase', () => {
    expect(ipaCore('/ˈæn.əl.aɪz/, /ˈæn.l̩.aɪz/')).toBe('ˈæn.əl.aɪz');
    expect(ipaSegments('/ˈfuːd ˌkɔːrt/').map((s) => s.syllable)).toEqual(['fuːd']);
  });

  it('splits the written word like its IPA (canvas: MIT-i-gate)', () => {
    expect(spellingSegments('mitigate', '/ˈmɪt.ɪ.ɡeɪt/')).toEqual([
      { text: 'mit', stressed: true },
      { text: 'i', stressed: false },
      { text: 'gate', stressed: false },
    ]);
    expect(stressedSpelling('mitigate', '/ˈmɪt.ɪ.ɡeɪt/')).toBe('MIT');
    expect(stressedSpelling('drought', '/draʊt/')).toBe('DROUGHT');
    expect(stressedSpelling('food court', '/ˈfuːd ˌkɔːrt/')).toBe('FOOD');
    expect(stressedSpelling('mitigate', null)).toBeNull();
    const parts = spellingSegments('biodiversity', '/ˌbaɪ.oʊ.daɪˈvɜːr.sə.ti/');
    expect(parts.map((p) => p.text).join('')).toBe('biodiversity');
    expect(parts).toHaveLength(6);
    expect(parts.every((p) => p.text.length > 0)).toBe(true);
  });
});
