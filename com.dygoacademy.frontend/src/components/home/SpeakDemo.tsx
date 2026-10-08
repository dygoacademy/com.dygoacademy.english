'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '@/components/garden/cn';
import { MicIcon, RetryIcon, SpeakerIcon } from '@/components/garden/icons';
import { CompareWaveform, StageScore, Waveform } from '@/components/garden/speaking';
import type { SpeakingTimings } from '@/types';

import fixture from '../../../public/audio/speaking-fixture/fixture-mitigate.json';

/** The three demo states (H3 `#speak`; `compared` is the H3s `LandingV2SpeakCompared` board). */
export type SpeakDemoState = 'idle' | 'listening' | 'compared';

/** How long "Listening…" shows before the sample result (ms). */
export const LISTEN_MS = 2400;
/** The sample learner's score, as the canvas draws it (SpeakCompare, done). */
export const DEMO_PCT = 76;

const TIMINGS = fixture.timings_uk as SpeakingTimings;
const WORDS = fixture.sentence.split(' ');
const TARGET = fixture.target_index;
const FPS = 100;

/**
 * A speech-like envelope (100 fps) from the word timings: one hump per
 * syllable, louder on the stressed one. `soften` scales the target word's
 * stressed syllable, `drop` silences a word: the sample learner said MIT
 * too softly. No audio is decoded, so the page makes no requests.
 */
function envelope({ soften = 1, drop = -1 }: { soften?: number; drop?: number } = {}): number[] {
  const out = new Array<number>(Math.ceil(TIMINGS.duration * FPS)).fill(0.02);
  TIMINGS.words.forEach((w, wi) => {
    if (wi === drop) return;
    const parts = w.syllables.length ? w.syllables : [{ start: w.start, end: w.end, stressed: true }];
    parts.forEach((s) => {
      const peak = (s.stressed ? 0.95 : 0.6) * (wi === TARGET && s.stressed ? soften : 1);
      const from = Math.round(s.start * FPS);
      const to = Math.max(from + 1, Math.round(s.end * FPS));
      for (let f = from; f < to && f < out.length; f++) {
        out[f] = Math.max(out[f], peak * Math.sin((Math.PI * (f - from)) / (to - from)));
      }
    });
  });
  return out;
}

const NATIVE = envelope();
const USER = envelope({ soften: 0.35 });
const TARGET_SPAN = {
  start: TIMINGS.words[TARGET].start / TIMINGS.duration,
  end: TIMINGS.words[TARGET].end / TIMINGS.duration,
};

export interface SpeakDemoProps {
  /** Where "Practise free" goes (`/register`). */
  registerHref: string;
  /** Start in this state (reference fixtures); `idle` by default. */
  initialState?: SpeakDemoState;
  /**
   * The native clip to play (a static file under /public). None yet: the
   * only clip in the repo is the robotic dev fixture ("Not for learners"),
   * so Play is hidden until a real recording is added.
   */
  nativeAudioSrc?: string;
}

/**
 * Home page · Speaking demo card (CHANGELOG 2026-10-07, H3 / H4 `#speak`).
 * The sentence with *mitigate*, the native waveform with Native · UK, and a
 * clay mic. The mic shows "Listening…", then a **sample** learner's result
 * (D-8 not decided: no microphone, no backend call): their waveform over
 * the native one, an amber band on MIT, "In bloom · 76% match", Try again
 * and Practise free.
 */
export function SpeakDemo({ registerHref, initialState = 'idle', nativeAudioSrc }: SpeakDemoProps) {
  const t = useTranslations('screens.home.public.speak.demo');
  const [state, setState] = React.useState<SpeakDemoState>(initialState);
  const [playKey, setPlayKey] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const audio = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (state !== 'listening') return;
    const id = window.setTimeout(() => setState('compared'), LISTEN_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  React.useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setPlaying(false), TIMINGS.duration * 1000);
    return () => window.clearTimeout(id);
  }, [playing, playKey]);

  function play() {
    if (!nativeAudioSrc) return;
    audio.current ??= new Audio(nativeAudioSrc);
    audio.current.currentTime = 0;
    void audio.current.play().catch(() => setPlaying(false));
    setPlayKey((k) => k + 1);
    setPlaying(true);
  }

  const compared = state === 'compared';

  return (
    <div
      data-speak-demo={state}
      className="flex flex-col gap-4 rounded-[26px] border border-border bg-surface p-[18px] home-lg:p-6"
    >
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">{t('say')}</span>
        <p lang="en" className="m-0 font-display text-[21px] font-semibold leading-[1.3] home-lg:text-[24px]">
          {WORDS.map((word, i) => (
            <React.Fragment key={i}>
              {i > 0 ? ' ' : null}
              {i === TARGET ? (
                <span
                  className={gcn(
                    'rounded-md px-1',
                    compared ? 'bg-gold-soft text-gold-soft-text' : 'bg-on-forest-muted text-forest',
                  )}
                >
                  {word}
                </span>
              ) : (
                word
              )}
            </React.Fragment>
          ))}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 rounded-[18px] bg-bg p-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-forest">{t('native')}</span>
          <div className="grow" />
          {nativeAudioSrc ? (
            <button
              type="button"
              onClick={play}
              aria-label={t('playLabel')}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[14px] font-bold text-forest"
            >
              <SpeakerIcon width={16} height={16} />
              {t('play')}
            </button>
          ) : null}
        </div>
        {compared ? (
          <CompareWaveform
            native={NATIVE}
            user={USER}
            view="overlay"
            bands={[{ ...TARGET_SPAN, target: true }]}
            label={t('waveCompare')}
          />
        ) : (
          <Waveform
            levels={NATIVE}
            target={TARGET_SPAN}
            playingMs={playing ? TIMINGS.duration * 1000 : null}
            playKey={playKey}
            label={t('waveNative')}
          />
        )}
        {compared ? (
          <div aria-hidden="true" className="flex gap-3.5 text-[12px] font-semibold text-muted-foreground">
            <Legend className="bg-[var(--stage-sprout)]" text={t('legend.native')} />
            <Legend className="bg-primary" text={t('legend.you')} />
            <Legend className="bg-gold-light" text={t('legend.needsWork')} />
          </div>
        ) : null}
      </div>

      {compared ? (
        <div className="flex flex-col gap-3">
          <StageScore
            stage="bloom"
            title={t('match', { pct: DEMO_PCT })}
            scale={t.rich('scale', { b: (chunks) => <b className="font-bold">{chunks}</b> })}
          />
          <p className="m-0 rounded-[14px] border border-gold-border bg-gold-soft px-3.5 py-2.5 text-[14px] leading-[1.45] text-gold-soft-text">
            {t('tip')}
          </p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setState('idle')}
              className="inline-flex h-12 items-center gap-1.5 rounded-[16px] border border-border bg-surface px-4 text-[15px] font-bold text-forest"
            >
              <RetryIcon width={16} height={16} />
              {t('tryAgain')}
            </button>
            <Link
              href={registerHref}
              className="inline-flex h-12 grow items-center justify-center rounded-[16px] bg-primary px-4 text-[15px] font-bold text-white no-underline shadow-[0_3px_0_var(--color-primary-shadow)]"
            >
              {t('practise')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-1">
          <button
            type="button"
            onClick={() => setState('listening')}
            disabled={state === 'listening'}
            aria-label={t('micLabel')}
            className={gcn(
              'flex size-[72px] items-center justify-center rounded-full bg-primary text-white shadow-[0_4px_0_var(--color-primary-shadow)]',
              state === 'listening' && 'animate-pulse motion-reduce:animate-none',
            )}
          >
            <MicIcon width={30} height={30} />
          </button>
          <span role="status" className="text-[14px] font-semibold text-muted-foreground">
            {state === 'listening' ? t('listening') : t('tapMic')}
          </span>
        </div>
      )}

      <span className="text-[12px] leading-[1.4] text-muted-foreground">{t('sample')}</span>
    </div>
  );
}

function Legend({ className, text }: { className: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={gcn('h-2 w-3.5 rounded-sm', className)} />
      {text}
    </span>
  );
}
