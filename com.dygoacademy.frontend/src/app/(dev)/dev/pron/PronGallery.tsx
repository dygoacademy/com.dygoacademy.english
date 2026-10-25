'use client';

import * as React from 'react';

import { PronounceScreen, type PronPhase } from '@/components/garden/pronounce/PronounceScreen';
import { SpeakMicScreen } from '@/components/garden/pronounce/SpeakMicScreen';
import { MOCK_WORDS, mockWordCheck } from '@/lib/pronunciation/mock';
import { toPronunciationResult, type ResultKind } from '@/lib/pronunciation/pronunciationResult';
import type { SpeakingSyllable } from '@/types';

import { CombPreview } from './CombPreview';

/** The plan's sample words (§4 mock table), with the boards' IPA and meanings. */
export const GALLERY_WORDS: Record<
  'mitigate' | 'compensation' | 'cloudy' | 'sunny',
  { stones: SpeakingSyllable[]; ipa: string; en: string; vi: string }
> = {
  mitigate: {
    stones: [
      { text: 'mi', stressed: true },
      { text: 'ti', stressed: false },
      { text: 'gate', stressed: false },
    ],
    ipa: '/ˈmɪt.ɪ.ɡeɪt/',
    en: 'to make something less harmful',
    vi: 'giảm nhẹ, làm dịu bớt',
  },
  compensation: {
    stones: [
      { text: 'com', stressed: false },
      { text: 'pen', stressed: false },
      { text: 'sa', stressed: true },
      { text: 'tion', stressed: false },
    ],
    ipa: '/ˌkɒm.penˈseɪ.ʃən/',
    en: 'money paid for a loss',
    vi: 'tiền bồi thường',
  },
  cloudy: {
    stones: [
      { text: 'clou', stressed: true },
      { text: 'dy', stressed: false },
    ],
    ipa: '/ˈklaʊ.di/',
    en: 'full of clouds',
    vi: 'nhiều mây',
  },
  sunny: {
    stones: [
      { text: 'sun', stressed: true },
      { text: 'ny', stressed: false },
    ],
    ipa: '/ˈsʌn.i/',
    en: 'bright with sunshine',
    vi: 'có nắng',
  },
};
export type GalleryWord = keyof typeof GALLERY_WORDS;

const noop = () => undefined;
/** A made-up voice for the mirror waveform: native above, the learner's below (louder in the weak part). */
const NATIVE_BARS = Array.from({ length: 40 }, (_, i) => Math.abs(Math.sin(i / 4)) * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7))));
const KIND: Record<'pass' | 'almost' | 'retry', ResultKind> = { pass: 'pass', almost: 'almostPerfect', retry: 'retry' };

export function PronGallery({
  screen,
  result,
  round,
  word,
  vi,
}: {
  screen: string;
  result: 'pass' | 'almost' | 'retry';
  round: 'next' | 'last';
  word: GalleryWord;
  vi: boolean;
}) {
  if (screen === 'comb') return <CombPreview />;
  if (screen === 'SP0-ask' || screen === 'SP0-denied') {
    return (
      <SpeakMicScreen
        state={screen === 'SP0-ask' ? 'ask' : 'denied'}
        closeHref="#"
        onAllow={noop}
        onOpenSettings={noop}
        onListen={noop}
      />
    );
  }
  const d = GALLERY_WORDS[word];
  const n = d.stones.length;
  const phase: PronPhase =
    screen === 'P2' || screen === 'P2-beep'
      ? 'recording'
      : screen === 'P3' || screen === 'P3-failed'
        ? 'checking'
        : screen.startsWith('P2b')
          ? 'notHeard'
          : screen === 'P4'
            ? 'result'
            : 'say';
  const total = round === 'last' ? 1 : 3;
  const scored =
    phase === 'result'
      ? toPronunciationResult({
          word,
          stones: d.stones,
          check: mockWordCheck(word, d.stones, KIND[result]),
          nativeAudioUrl: '',
          learnerAudioUrl: '',
          round: { index: 0, total, nextWord: round === 'last' ? undefined : 'deforestation' },
        })
      : null;
  const weak = MOCK_WORDS[word].weak;
  const mine = NATIVE_BARS.map((v, i) =>
    result !== 'pass' && Math.floor((i * n) / 40) === weak ? Math.min(1, v * 1.5) : v * 0.92,
  );
  return (
    <PronounceScreen
      phase={phase}
      word={word}
      ipa={d.ipa}
      meaning={vi ? d.vi : d.en}
      meaningLang={vi ? 'vi' : 'en'}
      syllables={d.stones}
      index={0}
      total={total}
      closeHref="#"
      clips={{ normal: { src: null }, slow: { src: null }, native: { src: null }, you: { src: null } }}
      reached={screen === 'P2' ? Math.min(2, n) : 0}
      level={screen === 'P2' ? 0.55 : 0}
      started={screen === 'P2'}
      elapsedMs={screen === 'P2' ? 900 : 0}
      failed={screen === 'P3-failed'}
      result={scored}
      waves={{ native: NATIVE_BARS, mine }}
      reason={screen === 'P2b-noisy' ? 'noisy' : screen === 'P2b-other' ? 'other' : 'quiet'}
      heard="medicate"
    />
  );
}
