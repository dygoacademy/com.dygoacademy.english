'use client';

import * as React from 'react';

import { PronounceScreen, type PronPhase } from '@/components/garden/pronounce/PronounceScreen';
import { PronResult } from '@/components/garden/pronounce/PronResult';
import { SpeakMicScreen } from '@/components/garden/pronounce/SpeakMicScreen';

import { CombPreview } from './CombPreview';
import { resultView } from '@/lib/speaking/pronounce';
import type { SpeakingSyllable } from '@/types';

/** The boards' sample words (PronStonesResult.dc.html `WORDS`). */
const WORDS: Record<
  'mitigate' | 'compensation' | 'sunny',
  { stones: SpeakingSyllable[]; ipas: string[]; wob: number; heard: string | null; nat: number; mine: number }
> = {
  mitigate: {
    stones: [
      { text: 'mi', stressed: true },
      { text: 'ti', stressed: false },
      { text: 'gate', stressed: false },
    ],
    ipas: ['mɪt', 'tɪ', 'ɡeɪt'],
    wob: 1,
    heard: 'taɪ',
    nat: 0.8,
    mine: 1.0,
  },
  compensation: {
    stones: [
      { text: 'com', stressed: false },
      { text: 'pen', stressed: false },
      { text: 'sa', stressed: true },
      { text: 'tion', stressed: false },
    ],
    ipas: ['kɒm', 'pen', 'seɪ', 'ʃən'],
    wob: 2,
    heard: 'sæ',
    nat: 1.1,
    mine: 1.3,
  },
  sunny: {
    stones: [
      { text: 'sun', stressed: true },
      { text: 'ny', stressed: false },
    ],
    ipas: ['sʌn', 'ni'],
    wob: 1,
    heard: 'naɪ',
    nat: 0.6,
    mine: 0.8,
  },
};

const noop = () => undefined;

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
  word: keyof typeof WORDS;
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
  if (screen === 'P4') {
    const d = WORDS[word];
    const scores = d.stones.map((_, k) =>
      k !== d.wob ? 95 : result === 'retry' ? 40 : result === 'almost' ? 80 : 95,
    );
    const total = result === 'retry' ? 62 : result === 'almost' ? 86 : 95;
    const syllables = d.ipas.map((ipa, k) => ({
      ipa,
      score: scores[k],
      wobbly: scores[k] < 60,
      heard_ipa: k === d.wob ? d.heard : null,
    }));
    const view = resultView(d.stones, { total, syllables });
    if (!view) return null;
    return (
      <PronResult
        word={word}
        index={0}
        total={round === 'last' ? 1 : 3}
        view={view}
        syllables={syllables}
        nextWord={round === 'last' ? null : 'deforestation'}
        closeHref="#"
        nativeClip={{ src: null }}
        mineClip={{ src: null }}
        nativeS={d.nat}
        mineS={result === 'pass' ? d.nat : d.mine}
        selected={view.selected}
        onChip={noop}
        onAction={noop}
      />
    );
  }
  const phase: PronPhase =
    screen === 'P2' || screen === 'P2-beep'
      ? 'recording'
      : screen === 'P3'
        ? 'checking'
        : screen.startsWith('P2b')
          ? 'notHeard'
          : 'say';
  const levels = [0.02, 0.05, 0.12, 0.18, 0.15, 0.08];
  return (
    <PronounceScreen
      phase={phase}
      word="mitigate"
      ipa="/ˈmɪt.ɪ.ɡeɪt/"
      meaning={vi ? 'giảm nhẹ, làm dịu bớt' : 'to make something less harmful'}
      meaningLang={vi ? 'vi' : 'en'}
      syllables={WORDS.mitigate.stones}
      index={0}
      total={3}
      closeHref="#"
      hearClip={{ src: null }}
      slowClip={{ src: null }}
      lit={screen === 'P2' ? 1 : 0}
      levels={screen === 'P2' ? levels : []}
      elapsedMs={screen === 'P2' ? 900 : 0}
      reason={screen === 'P2b-noisy' ? 'noisy' : screen === 'P2b-other' ? 'other' : 'quiet'}
      heard="medicate"
    />
  );
}
