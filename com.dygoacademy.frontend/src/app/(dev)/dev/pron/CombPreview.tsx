'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import type { ExclusiveState } from '@/hooks/useExclusiveAudio';
import { HoneycombBoard, type CombMode } from '@/components/garden/pronounce/HoneycombBoard';
import { ListenCard } from '@/components/garden/pronounce/ListenCard';
import { MatchRing, MirrorWave, VoiceMeterComb } from '@/components/garden/pronounce/CombMeters';
import { useMsg } from '@/components/garden/pronounce/useMsg';
import { mockWordCheck } from '@/lib/pronunciation/mock';
import {
  buildResultViewModel,
  resultDetail,
  toPronunciationResult,
  type ResultKind,
} from '@/lib/pronunciation/pronunciationResult';
import type { SpeakingSyllable } from '@/types';

/** The honeycomb's building blocks (plan Phase 2): each board mode × 2 / 3 / 4 syllables, the listen card's states, the meters. */
const WORDS: Record<string, SpeakingSyllable[]> = {
  sunny: [
    { text: 'sun', stressed: true },
    { text: 'ny', stressed: false },
  ],
  mitigate: [
    { text: 'mi', stressed: true },
    { text: 'ti', stressed: false },
    { text: 'gate', stressed: false },
  ],
  compensation: [
    { text: 'com', stressed: false },
    { text: 'pen', stressed: false },
    { text: 'sa', stressed: true },
    { text: 'tion', stressed: false },
  ],
};

const MODES: CombMode[] = ['empty', 'live', 'checking', 'dim', 'result'];
const KINDS: ResultKind[] = ['pass', 'almostPerfect', 'retry'];

function ResultBoard({ word, kind }: { word: string; kind: ResultKind }) {
  const t = useTranslations('screens.pronounce');
  const msg = useMsg();
  const stones = WORDS[word];
  const result = toPronunciationResult({
    word,
    stones,
    check: mockWordCheck(word, stones, kind),
    nativeAudioUrl: '',
    learnerAudioUrl: '',
    round: { index: 0, total: 3, nextWord: 'deforestation' },
  })!;
  const vm = buildResultViewModel(result);
  const [selected, setSelected] = React.useState(vm.selected);
  return (
    <HoneycombBoard
      mode="result"
      syllables={stones}
      title={t('comb.title.result')}
      passLine={t('comb.passLine', { mark: vm.passMark })}
      label={msg(vm.boardLabel)}
      result={{
        cells: vm.cells.map((c) => ({ score: c.score, status: c.status, aria: msg(c.aria) })),
        selected,
        onSelect: setSelected,
        detail: (() => {
          const d = resultDetail(vm, result, selected);
          return { tag: msg(d.tag), tone: d.tone, text: msg(d.text) };
        })(),
      }}
    />
  );
}

export function CombPreview() {
  const t = useTranslations('screens.pronounce');
  const states: ExclusiveState[] = ['idle', 'loading', 'playing', 'error'];
  const native = Array.from({ length: 40 }, (_, i) => Math.abs(Math.sin(i / 4)) * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7))));
  const mine = native.map((v, i) => (i >= 13 && i < 26 ? Math.min(1, v * 1.4) : v * 0.9));
  return (
    <div className="mx-auto flex max-w-[390px] flex-col gap-4 bg-background px-[18px] py-5">
      {MODES.filter((m) => m !== 'result').map((mode) =>
        Object.entries(WORDS).map(([word, stones]) => (
          <section key={`${mode}-${word}`} data-preview={`${mode}-${word}`}>
            <HoneycombBoard
              mode={mode}
              syllables={stones}
              title={t(
                mode === 'empty'
                  ? 'comb.title.empty'
                  : mode === 'live'
                    ? 'comb.title.live'
                    : mode === 'checking'
                      ? 'comb.title.checking'
                      : 'comb.title.dim',
              )}
              passLine={t('comb.passLine', { mark: 80 })}
              label={word}
              reached={mode === 'live' ? 2 : 0}
            />
          </section>
        )),
      )}
      {KINDS.map((kind) =>
        Object.keys(WORDS).map((word) => (
          <section key={`result-${kind}-${word}`} data-preview={`result-${kind}-${word}`}>
            <ResultBoard word={word} kind={kind} />
          </section>
        )),
      )}
      {states.map((s) => (
        <section key={s} data-preview={`listen-${s}`} className="flex flex-col gap-3">
          <ListenCard
            eyebrow={t('p1.listenEyebrow')}
            title={t('p1.listenTitle')}
            buttons={[
              { key: 'normal', label: t('p1.normal'), sub: t('p1.normalSub'), tone: 'green', aria: t('p1.normalAria', { word: 'mitigate' }) },
              { key: 'slow', label: t('p1.slow'), sub: t('p1.slowSub'), tone: 'green', aria: t('p1.slowAria', { word: 'mitigate' }) },
            ]}
            stateOf={(k) => (k === 'normal' ? s : 'idle')}
            onTap={() => undefined}
            playing="solid"
            loadingText={t('listen.loading')}
            playingText={t('listen.playingStop')}
            errorText={t('listen.error')}
          />
          <ListenCard
            eyebrow={t('p3.listenEyebrow')}
            title={t('p3.listenTitle')}
            buttons={[
              { key: 'native', label: t('btn.native'), sub: t('btn.nativeSub'), tone: 'green', aria: t('btn.nativeAria', { word: 'mitigate' }) },
              { key: 'you', label: t('btn.you'), sub: t('btn.youSub'), tone: 'clay', aria: t('btn.youAria', { word: 'mitigate' }) },
            ]}
            stateOf={(k) => (k === 'you' ? s : 'idle')}
            onTap={() => undefined}
            playing="tint"
            loadingText={t('listen.loading')}
            errorText={t('listen.error')}
          />
        </section>
      ))}
      <section data-preview="meters" className="flex flex-col gap-3">
        <VoiceMeterComb level={0} recording={false} label={t('p2.voiceLabel')} status={t('p2.voiceStarting')} />
        <VoiceMeterComb level={0.6} recording label={t('p2.voiceLabel')} status={t('p2.voiceRec')} />
        <div className="flex flex-col gap-2.5 rounded-[22px] border border-border bg-surface px-3.5 pb-3.5 pt-3">
          <div className="flex items-center gap-3">
            <MirrorWave native={native} mine={mine} zone={{ start: 1 / 3, end: 2 / 3, tag: 'ti' }} label="wave" />
            <MatchRing value={82} tone="retry" label="82" />
          </div>
          <div className="flex items-center gap-3">
            <MirrorWave native={null} mine={null} label="skeleton" />
            <MatchRing value={93} tone="ok" label="93" />
          </div>
        </div>
      </section>
    </div>
  );
}
