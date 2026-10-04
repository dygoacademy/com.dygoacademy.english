'use client';

import * as React from 'react';

import { Button } from '@/components/garden/Button';
import {
  CompareWaveform,
  LiveWaveform,
  SpeakingPlant,
  StageScore,
  targetSpan,
  Waveform,
  WordMarks,
  type CompareView,
} from '@/components/garden/speaking';
import { fetchAndDecode, getAudioContext, rmsEnvelope } from '@/lib/speaking/audio';
import { SPEAKING_STAGES, type SpeakingTimings, type SpeakingWordMark } from '@/types';

/**
 * Phase 13 speaking components on /garden/_gallery (T5, schedules S4–S5), with the
 * fixture sentence "Planting more trees can help mitigate the effects of
 * climate change." Gallery-only labels, English, kept here until S6 adds
 * the speaking strings (phase notes, decision S4-b).
 */
const COPY = {
  listen: 'Waveform · SP1 native speaker',
  live: 'LiveWaveform · SP2 recording',
  compare: 'CompareWaveform · SP3',
  overlay: 'Overlay',
  stacked: 'Side by side',
  play: 'Play sweep',
  grow: 'Grow live bars',
  real: 'Use the real fixture clip',
  nativeLabel: 'Waveform of a native speaker saying the sentence',
  liveLabel: 'Your voice, live, over the native shape',
  compareLabel: 'Your sentence in clay over the native speaker in green',
  marks: 'WordMarks · SP3',
  stages: 'StageScore · SP3 (each stage)',
  plants: 'SpeakingPlant · SP4 garden',
  reasons: {
    stress_soft: 'MIT is too soft',
    missing: 'not heard',
    rushed: 'too fast',
    slow: 'too slow',
  },
  stageTitle: { seed: 'Seed', sprout: 'Sprout', bloom: 'In bloom', fruit: 'Fruit' },
  match: (stage: string, pct: number) => `${stage} · ${pct}% match`,
  scale: 'Seed · Sprout · Bloom · ',
  scaleEnd: 'Fruit at 90%',
} as const;

const DEMO_MARKS: SpeakingWordMark[] = [
  { index: 5, ok: false, reason: 'stress_soft' },
  { index: 9, ok: false, reason: 'rushed' },
];
const STAGE_PCT = { seed: 31, sprout: 58, bloom: 82, fruit: 94 } as const;

const FIXTURE_URL = '/audio/speaking-fixture/fixture-mitigate-us.wav';
const FPS = 100;

/** Word layout of the fixture sentence, close to its real timings. */
const DEMO: SpeakingTimings = (() => {
  const words = [
    'Planting',
    'more',
    'trees',
    'can',
    'help',
    'mitigate',
    'the',
    'effects',
    'of',
    'climate',
    'change.',
  ];
  const lens = [0.42, 0.22, 0.3, 0.16, 0.24, 0.55, 0.1, 0.36, 0.1, 0.4, 0.45];
  let t = 0.1;
  const out = words.map((text, i) => {
    const w = { text, start: t, end: t + lens[i], syllables: [] };
    t += lens[i] + 0.06;
    return w;
  });
  return { duration: t + 0.1, words: out };
})();
const TARGET = 5;

/** A made-up but word-shaped envelope: one bump per word, the target's first syllable loudest. */
function demoEnvelope(timings: SpeakingTimings, wobble = 0, softTarget = false): number[] {
  const n = Math.round(timings.duration * FPS);
  const env = new Array<number>(n).fill(0.02);
  timings.words.forEach((w, wi) => {
    const a = Math.round(w.start * FPS);
    const b = Math.round(w.end * FPS);
    for (let k = a; k < b; k++) {
      const x = (k - a) / Math.max(1, b - a);
      let v = Math.sin(Math.PI * x) * (0.6 + 0.3 * Math.sin(wi * 1.7 + wobble));
      if (wi === TARGET) v = x < 0.33 ? (softTarget ? 0.45 : 1) : 0.45 * Math.sin(Math.PI * x);
      env[k] = Math.max(0.02, v);
    }
  });
  return env;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="overline-label mb-2 mt-5 text-label text-muted-foreground">{children}</p>;
}

export function SpeakingGallery() {
  const [native, setNative] = React.useState(() => demoEnvelope(DEMO));
  const [timings, setTimings] = React.useState<SpeakingTimings>(DEMO);
  const user = React.useMemo(() => demoEnvelope(DEMO, 0.8, true), []);
  const [view, setView] = React.useState<CompareView>('overlay');
  const [plays, setPlays] = React.useState(0);
  const [live, setLive] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (live.length === 0 || live.length >= timings.duration * 20) return;
    const id = setTimeout(() => {
      const t = live.length / 20;
      setLive((l) => [...l, 0.02 + 0.15 * Math.abs(Math.sin(t * 7)) * (t % 0.9 < 0.7 ? 1 : 0.1)]);
    }, 50);
    return () => clearTimeout(id);
  }, [live, timings.duration]);

  async function loadReal() {
    const pcm = await fetchAndDecode(FIXTURE_URL, getAudioContext());
    const res = await fetch('/audio/speaking-fixture/fixture-mitigate.json');
    const fx = (await res.json()) as { timings_us: SpeakingTimings };
    setNative(rmsEnvelope(pcm.samples, pcm.sampleRate, FPS));
    setTimings(fx.timings_us);
  }

  const target = targetSpan(timings, TARGET);
  const playingMs = plays > 0 ? timings.duration * 1000 : null;

  return (
    <div className="max-w-[358px]">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPlays((p) => p + 1)}>
          {COPY.play}
        </Button>
        <Button variant="secondary" onClick={() => setLive([0.02])}>
          {COPY.grow}
        </Button>
        <Button variant="secondary" onClick={() => void loadReal()}>
          {COPY.real}
        </Button>
      </div>

      <Label>{COPY.listen}</Label>
      <div className="rounded-card border border-border bg-surface p-4">
        <Waveform
          levels={native}
          target={target}
          playingMs={playingMs}
          playKey={plays}
          label={COPY.nativeLabel}
        />
      </div>

      <Label>{COPY.live}</Label>
      <div className="rounded-card border border-border bg-surface p-4">
        <LiveWaveform
          nativeLevels={native}
          nativeDuration={timings.duration}
          liveLevels={live}
          label={COPY.liveLabel}
        />
      </div>

      <Label>{COPY.compare}</Label>
      <div className="rounded-card border border-border bg-surface p-4">
        <div role="radiogroup" className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-track p-[3px]">
          {(['overlay', 'stacked'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={`h-[34px] rounded-[10px] text-[13px] font-bold ${view === v ? 'bg-surface shadow-sm' : ''}`}
            >
              {COPY[v]}
            </button>
          ))}
        </div>
        <CompareWaveform
          native={native}
          user={user}
          view={view}
          target={target}
          playingMs={playingMs}
          playKey={plays}
          label={COPY.compareLabel}
        />
      </div>

      <Label>{COPY.marks}</Label>
      <div className="rounded-card border border-border bg-surface p-4">
        <WordMarks
          words={timings.words.map((w) => w.text)}
          marks={DEMO_MARKS}
          reasonText={(m) => (m.reason ? COPY.reasons[m.reason] : null)}
        />
      </div>

      <Label>{COPY.stages}</Label>
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
        {SPEAKING_STAGES.map((stage) => (
          <StageScore
            key={stage}
            stage={stage}
            title={COPY.match(COPY.stageTitle[stage], STAGE_PCT[stage])}
            scale={
              <>
                {COPY.scale}
                <b>{COPY.scaleEnd}</b>
              </>
            }
          />
        ))}
      </div>

      <Label>{COPY.plants}</Label>
      <div className="flex items-end justify-around rounded-card bg-forest px-3 pt-3">
        {SPEAKING_STAGES.map((stage) => (
          <SpeakingPlant key={stage} stage={stage} />
        ))}
      </div>
    </div>
  );
}
