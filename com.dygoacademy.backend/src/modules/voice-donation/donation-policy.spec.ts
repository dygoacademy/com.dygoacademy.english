import { hasHardSound, normalizeText, qualityGate, usefulReason, wer } from './donation-policy';

describe('donation policy', () => {
  it('normalises text like the dataset tools', () => {
    expect(normalizeText("  I'm   READY, aren’t you?! ")).toBe("i'm ready aren't you");
    expect(normalizeText("'' -- ")).toBe('');
  });

  it('word error rate', () => {
    expect(wer('I think so', 'i think so')).toBe(0);
    expect(wer('I think so', 'I sink so')).toBeCloseTo(1 / 3);
    expect(wer('I think so', '')).toBe(1);
    expect(wer('', '')).toBe(0);
  });

  describe('qualityGate', () => {
    const ok = { total: 90, heard_text: 'I think so', duration_ms: 1500, voiced_ms: 900 };
    it('keeps a clean sentence', () => {
      expect(qualityGate('sentence', 'I think so.', ok)).toBeNull();
    });
    it.each([
      [{ ...ok, duration_ms: 400 }, 'too_short'],
      [{ ...ok, duration_ms: 21_000 }, 'too_long'],
      [{ ...ok, voiced_ms: 499 }, 'too_quiet'],
      [{ ...ok, heard_text: ' ' }, 'too_quiet'],
      [{ ...ok, heard_text: 'the weather is nice' }, 'wrong_prompt'],
    ])('sentence %o → %s', (scores, reason) => {
      expect(qualityGate('sentence', 'I think so.', scores)).toBe(reason);
    });
    it('keeps a mispronounced word in a sentence', () => {
      expect(qualityGate('sentence', 'I think so.', { ...ok, heard_text: 'I sink so' })).toBeNull();
    });
    it('word checks', () => {
      expect(qualityGate('word', 'think', { status: 'not_heard', duration_ms: 900 })).toBe(
        'not_heard',
      );
      expect(qualityGate('word', 'think', { status: 'other_word', duration_ms: 900 })).toBe(
        'wrong_prompt',
      );
      expect(qualityGate('word', 'think', { status: 'ok', duration_ms: 900 })).toBeNull();
    });
    it('a reply without the fields passes (the export checks the audio again)', () => {
      expect(qualityGate('word', 'think', null)).toBeNull();
    });
  });

  it('hard sounds for words: θ ð ʃ ʒ or a final consonant cluster', () => {
    expect(hasHardSound('/θɪŋk/')).toBe(true);
    expect(hasHardSound('/ˈmeʒ.ər/')).toBe(true);
    expect(hasHardSound('/test/')).toBe(true);
    expect(hasHardSound('/ˈmɪt.ɪ.ɡeɪt/')).toBe(false);
    expect(hasHardSound('/siː/')).toBe(false);
    expect(hasHardSound(null)).toBe(false);
  });

  describe('usefulReason', () => {
    it('sentence: flagged word, then disagreement, then an unsure total', () => {
      const words = [{ status: 'ok' }, { status: 'missing' }];
      expect(usefulReason('sentence', null, { total: 95, words })).toBe('flagged');
      expect(usefulReason('sentence', null, { total: 95, gopt: { total: 70 } })).toBe('disagree');
      expect(usefulReason('sentence', null, { total: 95, gopt: { total: null } })).toBeNull();
      expect(usefulReason('sentence', null, { total: 85 })).toBe('uncertain');
      expect(usefulReason('sentence', null, { total: 39 })).toBeNull();
    });
    it('word: wobbly syllable, unsure total, hard sound', () => {
      expect(usefulReason('word', '/siː/', { total: 95, syllables: [{ wobbly: true }] })).toBe(
        'flagged',
      );
      expect(usefulReason('word', '/siː/', { total: 50 })).toBe('uncertain');
      expect(usefulReason('word', '/θɪŋk/', { total: 95 })).toBe('hard_sound');
      expect(usefulReason('word', '/siː/', { total: 95 })).toBeNull();
    });
  });
});
