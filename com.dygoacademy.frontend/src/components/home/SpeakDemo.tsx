'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '@/components/garden/cn';

import { SPEAK_BARS_DESKTOP, SPEAK_BARS_PHONE, type SpeakBars } from './speakDemoBars';

/** The three demo states (canvas `spk`: idle, rec, done; `compared` is the H3s speaking-compared board). */
export type SpeakDemoState = 'idle' | 'listening' | 'compared';

/** How long "Listening…" shows before the sample result (ms), as on the canvas. */
export const LISTEN_MS = 2600;
/** The sample learner's score, as the canvas draws it. */
export const DEMO_PCT = 76;

/** The demo sentence (English in every language, like the canvas). */
const SENTENCE = { before: 'We need to ', word: 'mitigate', after: ' the risk before launch.' };
/** The time line under the waveform, per state (canvas `spkTime`). */
const TIME: Record<SpeakDemoState, string> = { idle: '0:03 · 1× / 0.75×', listening: '0:02', compared: '0:03' };

export interface SpeakDemoProps {
  /** Where "Practise free" goes (`/register`). */
  registerHref: string;
  /** Start in this state (reference fixtures); `idle` by default. */
  initialState?: SpeakDemoState;
}

/**
 * Home page · speaking demo card (canvas page "Landing Page", `#speak`, 2026-10-10;
 * D-8 decided by Dylan: an animated **sample**, no microphone, no backend call).
 * Idle: the sentence with *mitigate*, the native waveform, "Try it now".
 * Listening: the mic turns into a stop button with a pulsing ring and the
 * sample learner's clay bars move over the native ones, for LISTEN_MS. Result:
 * the bars stop, an amber box marks MIT, "In bloom · 76% match", the tip,
 * Try again and Practise free.
 */
export function SpeakDemo({ registerHref, initialState = 'idle' }: SpeakDemoProps) {
  const t = useTranslations('screens.home.public.speak.demo');
  const tSpeak = useTranslations('screens.home.public.speak');
  const [state, setState] = React.useState<SpeakDemoState>(initialState);

  React.useEffect(() => {
    if (state !== 'listening') return;
    const id = window.setTimeout(() => setState('compared'), LISTEN_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  const done = state === 'compared';
  const hasYou = state !== 'idle';

  return (
    <div
      data-speak-demo={state}
      className="flex flex-col gap-3.5 rounded-[24px] border border-border bg-surface p-4 shadow-[0_10px_30px_rgba(36,70,58,.08)] home-lg:p-[22px]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-[#9A6E14]">{t('say')}</span>
        <span className="whitespace-nowrap text-[12px] font-semibold text-muted-foreground">{t('level')}</span>
      </div>
      <p lang="en" className="m-0 font-display text-[20px] font-semibold leading-[1.3] home-lg:text-[24px]">
        <span className={gcn('transition-colors duration-300', done ? 'text-[#3E7F5A]' : 'text-text')}>
          {SENTENCE.before}
        </span>
        <span
          className={gcn(
            'rounded-md px-1 transition-colors duration-300 [box-decoration-break:clone]',
            done ? 'bg-[#FBF4E4] text-[#9A6E14]' : 'bg-[#E7EFE0] text-forest',
          )}
        >
          {SENTENCE.word}
        </span>
        <span className={gcn('transition-colors duration-300', done ? 'text-[#3E7F5A]' : 'text-text')}>
          {SENTENCE.after}
        </span>
      </p>

      <div className="flex flex-col gap-2 rounded-2xl bg-[#F7F4EC] px-2.5 pb-2 pt-2.5">
        <Bars bars={SPEAK_BARS_PHONE} done={done} hasYou={hasYou} className="block home-lg:hidden" />
        <Bars bars={SPEAK_BARS_DESKTOP} done={done} hasYou={hasYou} className="hidden home-lg:block" />
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="native" initial={<GlobeIcon />} label={t('native')} />
          {hasYou ? <Chip tone="you" initial={t('youInitial')} label={t('you')} /> : null}
          <span className="grow" />
          <span className="whitespace-nowrap text-[12px] text-muted-foreground">{TIME[state]}</span>
        </div>
      </div>

      {state === 'idle' ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setState('listening')}
            aria-label={t('micLabel')}
            className="flex size-[60px] shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_4px_0_#7E3719]"
          >
            <MicGlyph size={26} />
          </button>
          <div className="flex flex-col gap-0.5">
            <span className="text-[16px] font-bold">{t('tryNow')}</span>
            <span className="text-[13px] leading-[1.4] text-muted-foreground">{t('tryNowText')}</span>
          </div>
        </div>
      ) : null}

      {state === 'listening' ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setState('compared')}
            aria-label={t('stopLabel')}
            className="home-speak-ring flex size-[60px] shrink-0 items-center justify-center rounded-full bg-primary text-white"
          >
            <span className="size-[18px] rounded bg-white" />
          </button>
          <div role="status" className="flex flex-col gap-0.5">
            <span className="text-[16px] font-bold text-primary">{t('listening')}</span>
            <span className="text-[13px] leading-[1.4] text-muted-foreground">{t('listeningText')}</span>
          </div>
        </div>
      ) : null}

      {done ? (
        <div className="flex animate-[rise_.3s_ease-out] flex-col gap-3 motion-reduce:animate-none">
          <div className="flex items-center gap-3 rounded-2xl bg-[#FBF4E4] px-3 py-2.5">
            <BloomGlyph />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-display text-[18px] font-semibold">{t('match', { pct: DEMO_PCT })}</span>
              <span className="text-[13px] leading-[1.4] text-[#44524A]">
                {t.rich('tip', {
                  b: (chunks) => <b className="text-[#9A6E14]">{chunks}</b>,
                  plain: (chunks) => <b>{chunks}</b>,
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setState('idle')}
              className="h-12 flex-1 rounded-full border-[1.5px] border-forest bg-surface text-[15px] font-bold text-forest"
            >
              {t('tryAgain')}
            </button>
            <Link
              href={registerHref}
              className="flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-primary text-[15px] font-bold text-white no-underline shadow-[0_3px_0_#7E3719]"
            >
              {t('practise')}
            </Link>
          </div>
        </div>
      ) : null}

      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <LockGlyph />
        {tSpeak('privacy')}
      </span>
    </div>
  );
}

/** The native bars (green) and, once the demo runs, the sample learner's (clay): moving while listening, still in the result. */
function Bars({ bars, done, hasYou, className }: { bars: SpeakBars; done: boolean; hasYou: boolean; className: string }) {
  const [bx, bw, bh] = bars.band;
  return (
    <svg
      width="100%"
      height={bars.height}
      viewBox={`0 0 ${bars.width} ${bars.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      {done ? (
        <rect x={bx} y={2} width={bw} height={bh} rx={6} fill="#FBF4E4" stroke="#E0B04A" strokeWidth={1.5} strokeDasharray="3 3" />
      ) : null}
      {bars.native.map(([x, y, w, h, rx], i) => (
        <rect key={`n${i}`} x={x} y={y} width={w} height={h} rx={rx} fill="#BFD3C3" />
      ))}
      {hasYou ? (
        <g>
          {bars.you.map(([x, y, w, h, rx, delay], i) => (
            <rect
              key={`y${i}`}
              className={done ? undefined : 'home-speak-wave'}
              style={done ? undefined : { animationDelay: `${delay}s` }}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={rx}
              fill="#B4552E"
              opacity={0.85}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}

function Chip({ tone, initial, label }: { tone: 'native' | 'you'; initial: React.ReactNode; label: string }) {
  const you = tone === 'you';
  return (
    <span
      className={gcn(
        'inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-2xl border border-border bg-surface pl-1 pr-3 text-[13px] font-bold',
        you ? 'text-primary' : 'text-forest',
      )}
    >
      <span
        className={gcn(
          'flex size-6 items-center justify-center rounded-full text-[12px] font-extrabold text-white',
          you ? 'bg-primary' : 'bg-forest',
        )}
      >
        {initial}
      </span>
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4 L20 12 L7 20 Z" fill="currentColor" />
      </svg>
      {label}
    </span>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21" />
      <path d="M12 3 C15 6 15 18 12 21 C9 18 9 6 12 3" />
    </svg>
  );
}

export function MicGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11 A6.5 6.5 0 0 0 18.5 11" />
      <path d="M12 17.5 V21" />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6A62" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11 V8 A4 4 0 0 1 16 8 V11" />
    </svg>
  );
}

function BloomGlyph() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <path d="M20 36 V22" stroke="#4E8A5F" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 30 C15 30 13 27 14 24 C18 24 20 27 20 30 Z" fill="#7FA487" />
      <circle cx="20" cy="13" r="4" fill="#E0B04A" />
      <circle cx="20" cy="6.5" r="4.2" fill="#E9A3A0" />
      <circle cx="26.5" cy="12" r="4.2" fill="#E9A3A0" />
      <circle cx="13.5" cy="12" r="4.2" fill="#E9A3A0" />
      <circle cx="16" cy="19" r="4.2" fill="#E9A3A0" />
      <circle cx="24" cy="19" r="4.2" fill="#E9A3A0" />
      <circle cx="20" cy="13" r="3.4" fill="#E0B04A" />
    </svg>
  );
}
