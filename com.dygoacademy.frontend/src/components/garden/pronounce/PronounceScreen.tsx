'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ipaSegments } from '@/lib/speaking/ipa';
import {
  bigStone,
  hopParts,
  PRON_MAX_MS,
  stoneText,
  type PronResultView,
} from '@/lib/speaking/pronounce';
import type { SpeakingSyllable } from '@/types';

import { gcn } from '../cn';
import { CloseIcon } from '../icons';
import { IconButton } from '../IconButton';
import { PondStones, type StoneLook } from './PondStones';

/**
 * Pronunciation "Stepping stones" (canvas page "Adult · Pronunciation",
 * 2026-10-11): P1 say the word, P2 recording, P3 checking, P4 result
 * (retry / pollinated) and P2b couldn't hear you, one screen per phase.
 *
 * Phone and iPad (iP1–iP4, iP2b) are one tree: on a phone the two column
 * wrappers are `display: contents`, so their parts line up in one column
 * in the boards' order (`order-*`); with the iPad layout on (`ipad:`) they
 * become the word card on the left and the pond with its controls on the
 * right. Parts only one layout has are hidden on the other.
 */
export type PronPhase = 'say' | 'recording' | 'checking' | 'result' | 'notHeard';
export type PronNotHeardReason = 'quiet' | 'noisy' | 'other';
/** Hear it / Slowly: which is loading or playing, or that the last play failed. */
export type PronAudio = 'idle' | 'loadingHear' | 'loadingSlow' | 'hear' | 'slow' | 'error';
export type { PronResultView };

export interface PronounceScreenProps {
  phase: PronPhase;
  word: string;
  ipa: string | null;
  meaning: string | null;
  meaningLang?: string;
  syllables: SpeakingSyllable[];
  /** 0-based word in this visit, of `total`. */
  index: number;
  total: number;
  /** The bed's name, for the iPad header ("Pronunciation · Environment"). */
  topic?: string | null;
  closeHref: string;
  onHearIt: () => void;
  onSlowly: () => void;
  /** P1 Hear it / Slowly state (boards P1-say-word-loading / -playing / -slowly / -sound-error). */
  audio?: PronAudio;
  /** P1. */
  onMic?: () => void;
  /** P1: a mic notice (denied, unsupported) in place of the hint; `micAvailable` false hides the mic. */
  notice?: React.ReactNode;
  micAvailable?: boolean;
  /** P2: stones lit so far, the live mic bars and the time since the beep. */
  lit?: number;
  levels?: readonly number[];
  elapsedMs?: number;
  onStop?: () => void;
  onCancel?: () => void;
  /** P3. */
  onHearMine?: () => void;
  onHearNative?: () => void;
  failed?: boolean;
  onCheckAgain?: () => void;
  onRecordAgain?: () => void;
  /** P4. */
  result?: PronResultView | null;
  onHearSyllable?: () => void;
  onTryAgain?: () => void;
  /** The next word, or null on the last one ("Back to the bed"). */
  nextWord?: string | null;
  onNext?: () => void;
  /** P2b. */
  reason?: PronNotHeardReason;
  heard?: string;
  onHearFirst?: () => void;
}

// Board icons (PronStones*.dc.html): speaker with one or two sound arcs, play, mic, stop.
function Speaker({ size, arcs = 2 }: { size: number; arcs?: 1 | 2 }) {
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
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
      <path d="M16 9 A4 4 0 0 1 16 15" />
      {arcs === 2 ? <path d="M18.5 6.5 A8 8 0 0 1 18.5 17.5" /> : null}
    </svg>
  );
}

/** Hear it / Slowly while the clip loads: a ring with a turning arc. */
const Spinner = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="2.6"
    strokeLinecap="round"
    aria-hidden="true"
    className="motion-safe:animate-spin"
  >
    <circle cx="12" cy="12" r="8" stroke="var(--color-forest-wash-border)" />
    <path d="M12 4 A8 8 0 0 1 20 12" stroke="var(--color-success)" />
  </svg>
);

/** Hear it / Slowly while the clip plays: three bars that rise and fall. */
const SoundBars = () => (
  <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
    {[
      { x: 2, y: 5, h: 10, delay: '0s' },
      { x: 8.4, y: 2, h: 16, delay: '.2s' },
      { x: 14.8, y: 5, h: 10, delay: '.4s' },
    ].map((bar) => (
      <rect
        key={bar.x}
        x={bar.x}
        y={bar.y}
        width="3.2"
        height={bar.h}
        rx="1.6"
        fill="currentColor"
        className="origin-center [transform-box:fill-box] motion-safe:animate-[sound-bar_.8s_ease-in-out_infinite]"
        style={{ animationDelay: bar.delay }}
      />
    ))}
  </svg>
);

const Play = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 5 L19 12 L7 19 Z" />
  </svg>
);

const Mic = ({ size, className }: { size: number; className?: string }) => (
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
    className={className}
  >
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11 A7 7 0 0 0 19 11" />
    <path d="M12 18 V21" />
  </svg>
);

const Flower = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
    <circle cx="20" cy="20" r="9" fill="var(--stage-tree-fruit)" />
    <circle cx="20" cy="8" r="6" fill="var(--stone-wobbly)" />
    <circle cx="32" cy="20" r="6" fill="var(--stone-wobbly)" />
    <circle cx="20" cy="32" r="6" fill="var(--stone-wobbly)" />
    <circle cx="8" cy="20" r="6" fill="var(--stone-wobbly)" />
  </svg>
);

/** Live mic level that fills a voice bar (the same full scale as SP2's live waveform). */
const LEVEL_FULL = 0.2;

/** "Your voice": the latest mic levels as bars, then the empty track. */
function VoiceBars({
  levels,
  width,
  height,
  bar,
  gap,
  x0,
}: {
  levels: readonly number[];
  width: number;
  height: number;
  bar: number;
  gap: number;
  /** Where the first bar starts. */
  x0: number;
}) {
  const fit = Math.floor((width - x0 + gap) / (bar + gap));
  const shown = levels.slice(-fit);
  const mid = height / 2;
  const tall = height - 4;
  const end = x0 + shown.length * (bar + gap);
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {shown.map((v, i) => {
        const h = Math.max(bar, Math.round(Math.min(1, v / LEVEL_FULL) * tall));
        return (
          <rect
            key={i}
            x={x0 + i * (bar + gap)}
            y={mid - h / 2}
            width={bar}
            height={h}
            rx={bar / 2}
            fill="var(--color-primary)"
          />
        );
      })}
      {end < width ? (
        <rect x={end} y={mid - 2} width={width - end} height="4" rx="2" fill="var(--pron-card-line)" />
      ) : null}
    </svg>
  );
}

/** The 4 s ring round the stop button: full at the beep, empty at PRON_MAX_MS. */
function TimerRing({ size, r, elapsedMs }: { size: number; r: number; elapsedMs: number }) {
  const len = Math.round(2 * Math.PI * r);
  const c = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0"
      aria-hidden="true"
    >
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-border)" strokeWidth="5" />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={Math.min(1, Math.max(0, elapsedMs / PRON_MAX_MS)) * len}
        transform={`rotate(-90 ${c} ${c})`}
      />
    </svg>
  );
}

/** "/ˈmɪt.ɪ.ɡeɪt/" with the stressed syllable picked out (the iPad word card). */
function IpaStressed({ ipa }: { ipa: string }) {
  const segs = ipaSegments(ipa);
  if (segs.length === 0) return <>{ipa}</>;
  return (
    <>
      /
      {segs.map((s, k) => {
        if (!s.stressed) return <React.Fragment key={k}>{s.text}</React.Fragment>;
        const marks = s.text.slice(0, s.text.length - s.syllable.length);
        return (
          <React.Fragment key={k}>
            {marks}
            <b className="text-[var(--pron-stress)]">{s.syllable}</b>
          </React.Fragment>
        );
      })}
      /
    </>
  );
}

const PRIMARY =
  'flex h-14 items-center justify-center gap-2 rounded-[18px] bg-primary text-[16px] font-bold text-white no-underline shadow-[0_4px_0_var(--color-primary-shadow)] ipad:h-[52px]';
const LINK =
  'self-center p-2 text-[14px] font-semibold text-muted-foreground underline ipad:text-[15px]';
const OUTLINE =
  'flex h-12 flex-1 items-center justify-center gap-2 rounded-[16px] border border-border bg-surface text-[15px] font-bold text-forest ipad:h-[52px] ipad:rounded-[18px] ipad:text-[16px]';

/** Hear it / Slowly: OUTLINE that shows a press, and its loading / playing looks. */
const HEAR = `${OUTLINE} transition-transform active:scale-[.97]`;
const HEAR_LOADING = 'border-forest-wash-border bg-forest-wash';
const HEAR_PLAYING = 'border-forest bg-forest text-white';

export function PronounceScreen(props: PronounceScreenProps) {
  const t = useTranslations('screens.pronounce');
  const speak = useTranslations('screens.speak');
  const { phase, syllables } = props;
  const audio = props.audio ?? 'idle';
  const stones = phase === 'result' && props.result ? props.result.stones : syllables;
  const lit = props.lit ?? 0;
  const list = stones.map(stoneText).join(', ');
  const big = bigStone(stones);
  const bold = (chunks: React.ReactNode) => <b>{chunks}</b>;
  const boldWord = (chunks: React.ReactNode) => <b lang="en">{chunks}</b>;
  const recording = phase === 'recording';
  const n = stones.length;

  // ── Header ──
  const centred = phase === 'recording' || phase === 'checking' || phase === 'notHeard';
  const header = (
    <div className="flex items-center gap-3 ipad:gap-4">
      {recording ? (
        <button
          type="button"
          onClick={props.onCancel}
          className="box-content flex h-11 items-center rounded-[22px] border border-border bg-surface px-3.5 text-[14px] font-bold text-muted-foreground ipad:px-4 ipad:text-[15px]"
        >
          {t('cancel')}
        </button>
      ) : phase === 'checking' ? (
        <>
          <span className="h-11 w-11 shrink-0 ipad:hidden" />
          <CloseLink href={props.closeHref} label={t('close')} className="hidden ipad:inline-flex" />
        </>
      ) : (
        <CloseLink href={props.closeHref} label={t('close')} />
      )}
      <span
        className={gcn(
          'flex-grow text-[12px] font-bold uppercase tracking-[.1em] ipad:text-center ipad:text-[13px]',
          centred && 'text-center',
          recording ? 'text-primary' : 'text-success',
        )}
      >
        {recording ? (
          <>
            <span aria-hidden="true">{'● '}</span>
            {t('recording')}
          </>
        ) : (
          <>
            <span className="ipad:hidden">{t('eyebrow')}</span>
            <span className="hidden ipad:inline">
              {props.topic ? t('eyebrowTopic', { topic: props.topic }) : t('eyebrow')}
            </span>
          </>
        )}
      </span>
      <span
        className={gcn(
          'text-[13px] font-bold text-muted-foreground ipad:min-w-[96px] ipad:text-right ipad:text-[14px]',
          centred && 'w-[74px] text-right ipad:w-auto',
        )}
      >
        {t('beeCount', { n: Math.min(props.total, props.index + 1), total: props.total })}
      </span>
    </div>
  );

  // ── The word (phone: centred, one line under it; iPad: the word card's top) ──
  const phoneSub =
    phase === 'recording'
      ? lit === 0
        ? t('beep')
        : t('keepGoing')
      : phase === 'checking'
        ? t('checking')
        : [props.ipa, props.meaning].filter(Boolean).join(' · ');
  const wordBlock = (
    <div className="order-1 flex flex-col items-center gap-0.5 text-center ipad:items-stretch ipad:gap-3 ipad:text-left">
      <span
        lang="en"
        className="font-display text-[44px] font-semibold leading-[1.05] ipad:text-[64px] ipad:leading-[1.02]"
      >
        {props.word}
      </span>
      <span className="text-[16px] text-muted-foreground ipad:hidden">{phoneSub}</span>
      {props.ipa ? (
        <span className="hidden text-[22px] text-muted-foreground ipad:block">
          <IpaStressed ipa={props.ipa} />
        </span>
      ) : null}
      {props.meaning ? (
        <span
          lang={props.meaningLang}
          className="hidden text-[17px] leading-[1.45] text-example ipad:block"
        >
          {props.meaning}
        </span>
      ) : null}
    </div>
  );

  const hearButtons = (
    <div
      className={gcn(
        'order-3 flex gap-2.5 ipad:mt-2 ipad:gap-3',
        phase === 'say' ? '' : 'hidden ipad:flex',
      )}
    >
      {(
        [
          { key: 'hear', label: t('hearIt'), arcs: 2, onClick: props.onHearIt },
          { key: 'slow', label: t('slowly'), arcs: 1, onClick: props.onSlowly },
        ] as const
      ).map((b) => {
        const loading = audio === (b.key === 'hear' ? 'loadingHear' : 'loadingSlow');
        const playing = audio === b.key;
        return (
          <button
            key={b.key}
            type="button"
            onClick={b.onClick}
            aria-pressed={loading || playing}
            aria-busy={loading || undefined}
            className={gcn(HEAR, loading && HEAR_LOADING, playing && HEAR_PLAYING)}
          >
            {loading ? <Spinner /> : playing ? <SoundBars /> : <Speaker size={20} arcs={b.arcs} />}
            {b.label}
          </button>
        );
      })}
    </div>
  );
  const playFailed =
    audio === 'error' ? (
      <p
        role="status"
        className={gcn(
          'order-3 -mt-1.5 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-primary-text',
          phase === 'say' ? '' : 'hidden ipad:flex',
        )}
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5 V13" />
          <path d="M12 16.5 V16.6" />
        </svg>
        {t('playFailed')}
      </p>
    ) : null;

  const parts = hopParts(stones);
  const tip = (
    <div
      className={gcn(
        'order-4 rounded-2xl bg-[var(--pron-tip)] px-3.5 py-3 text-[14px] leading-[1.45] text-[var(--pron-tip-text)] ipad:mt-auto ipad:rounded-[18px] ipad:px-[18px] ipad:py-3.5 ipad:text-[16px]',
        phase === 'say' ? '' : 'hidden ipad:block',
      )}
    >
      {t('hopIntro')}
      {parts.map((p, k) => (
        <React.Fragment key={k}>
          {k > 0 ? t('hopSep') : null}
          {t.rich(p.kind === 'hard' ? 'hopHard' : p.kind === 'light' ? 'hopLight' : 'hopThen', {
            s: p.text,
            b: (chunks) => <b lang="en">{chunks}</b>,
          })}
        </React.Fragment>
      ))}
      {t('hopEnd')}
    </div>
  );

  // ── The pond ──
  let looks: StoneLook[] = stones.map(() => 'dark');
  if (phase === 'say') looks = stones.map((s) => (s.stressed ? 'lit' : 'dark'));
  if (phase === 'recording') looks = stones.map((_, k) => (k < lit ? 'lit' : 'dark'));
  if (phase === 'checking') looks = stones.map(() => 'checking');
  if (phase === 'result' && props.result) {
    const r = props.result;
    looks = stones.map((_, k) => (!r.passed && r.wobbly[k] ? 'wobbly' : 'ok'));
  }
  const wobblyList = stones
    .filter((_, k) => looks[k] === 'wobbly')
    .map(stoneText)
    .join(', ');
  const pondLabel =
    phase === 'say'
      ? t('pond.say', { list, big })
      : phase === 'recording'
        ? lit === 0
          ? t('pond.waiting')
          : t('pond.lit', { list: stones.slice(0, lit).map(stoneText).join(', ') })
        : phase === 'checking'
          ? t('pond.checking')
          : phase === 'result'
            ? props.result?.passed
              ? t('pond.pass')
              : t('pond.retry', { wobbly: wobblyList })
            : t('pond.notHeard');
  const away = phase === 'result' && props.result?.passed;
  const pond = (size: 'phone' | 'ipad') => {
    const ipad = size === 'ipad';
    const geo = ipad
      ? { height: 300, waterY: 222 }
      : phase === 'say'
        ? { height: 200, waterY: 150 }
        : phase === 'notHeard'
          ? { height: 150, waterY: 104 }
          : { height: 170, waterY: 120 };
    const mid = Math.floor(n / 2);
    const bee =
      phase === 'say'
        ? { stone: 0, y: ipad ? 100 : 60 }
        : phase === 'recording'
          ? { stone: Math.max(0, lit - 1), y: ipad ? 124 : 46, motion: 'hop' as const }
          : phase === 'checking'
            ? ipad
              ? { stone: mid, y: 110 }
              : { x: 167, y: 40 }
            : phase === 'result'
              ? away
                ? ipad
                  ? { stone: mid, y: 110, motion: 'away' as const }
                  : { x: 160, y: 50, motion: 'away' as const }
                : { stone: 0, y: ipad ? 110 : 40, motion: 'still' as const }
              : { stone: 0, y: ipad ? 110 : 36, motion: 'still' as const, question: true };
    return (
      <PondStones
        size={size}
        syllables={stones}
        looks={looks}
        {...geo}
        bee={bee}
        ripple={phase === 'say' && !ipad}
        hopPath={phase === 'say'}
        splashAt={recording && lit > 0 ? lit - 1 : null}
        shimmer={phase === 'checking'}
        label={pondLabel}
        className={gcn(
          ipad ? 'hidden ipad:block' : 'ipad:hidden',
          phase === 'notHeard' && !ipad && 'mt-2',
        )}
      >
        {phase === 'say' ? (
          <span className="absolute left-4 top-3.5 text-[12px] font-semibold text-[var(--pond-path)] ipad:left-6 ipad:top-5 ipad:text-[14px]">
            {t('bigStone')}
          </span>
        ) : null}
      </PondStones>
    );
  };
  const pondPart = (
    <div className={phase === 'notHeard' ? 'order-1' : 'order-2'}>
      {pond('phone')}
      {pond('ipad')}
    </div>
  );

  // ── Controls (right column on iPad) ──
  let controls: React.ReactNode = null;
  let leftExtra: React.ReactNode = null;
  if (phase === 'say') {
    controls = (
      <div className="order-5 mt-auto flex flex-col items-center gap-2.5 ipad:mt-0 ipad:flex-grow ipad:justify-center ipad:gap-3">
        {props.notice}
        {props.micAvailable === false ? null : (
          <>
            {props.notice ? null : (
              <span className="text-[15px] font-semibold text-muted-foreground ipad:text-[17px]">
                {t('tapToSay')}
              </span>
            )}
            <button
              type="button"
              onClick={props.onMic}
              aria-label={t('startSpeaking')}
              className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-primary text-white shadow-[0_5px_0_var(--color-primary-shadow)] ipad:h-24 ipad:w-24"
            >
              <Mic size={34} className="ipad:h-[38px] ipad:w-[38px]" />
            </button>
            {props.notice ? null : (
              <span className="text-[12px] text-muted-foreground ipad:text-[13px]">
                <span className="ipad:hidden">{t('micFirstTime')}</span>
                <span className="hidden ipad:inline">{t('micFirstTimeIpad')}</span>
              </span>
            )}
          </>
        )}
      </div>
    );
  } else if (phase === 'recording') {
    const status = lit === 0 ? t('sayNow', { word: props.word }) : t('listening');
    leftExtra = (
      <div className="order-3 flex items-center gap-3 rounded-[18px] border border-border bg-surface px-3.5 py-2.5 ipad:hidden">
        <span className="shrink-0 text-[12px] font-bold text-muted-foreground">{t('yourVoice')}</span>
        <VoiceBars levels={props.levels ?? []} width={220} height={34} bar={6} gap={6} x0={2} />
      </div>
    );
    const stop = (size: 'phone' | 'ipad') => {
      const ipad = size === 'ipad';
      return (
        <div
          className={gcn(
            'relative flex items-center justify-center',
            ipad ? 'h-[124px] w-[124px]' : 'h-[108px] w-[108px]',
          )}
        >
          <span
            className={gcn(
              'pron-ring absolute rounded-full bg-[var(--pron-ring)]',
              ipad ? 'left-3.5 top-3.5 h-24 w-24' : 'left-3 top-3 h-[84px] w-[84px]',
            )}
          />
          <TimerRing size={ipad ? 124 : 108} r={ipad ? 57 : 46} elapsedMs={props.elapsedMs ?? 0} />
          <button
            type="button"
            onClick={props.onStop}
            aria-label={t('stopRecording')}
            className={gcn(
              'relative flex items-center justify-center rounded-full bg-primary text-white',
              ipad ? 'h-24 w-24' : 'h-[84px] w-[84px]',
            )}
          >
            <svg width={ipad ? 28 : 26} height={ipad ? 28 : 26} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="3" fill="#FFFFFF" />
            </svg>
          </button>
        </div>
      );
    };
    controls = (
      <div className="order-5 mt-auto flex flex-col items-center gap-2.5 ipad:mt-0 ipad:flex-grow ipad:justify-center ipad:gap-3">
        <span className="text-[15px] font-bold text-primary ipad:hidden" aria-live="polite">
          {status}
        </span>
        <div className="ipad:hidden">{stop('phone')}</div>
        <div className="hidden items-center gap-7 ipad:flex">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-muted-foreground">{t('yourVoice')}</span>
            <div className="w-[166px]">
              <VoiceBars levels={props.levels ?? []} width={166} height={40} bar={8} gap={6} x0={0} />
            </div>
          </div>
          {stop('ipad')}
          <span className="w-[166px] text-[16px] font-bold text-primary">
            {lit === 0 ? status : t('listeningSay', { word: props.word })}
          </span>
        </div>
        <span className="text-center text-[13px] text-muted-foreground ipad:text-[14px]">
          {t('autoStop')}
        </span>
      </div>
    );
  } else if (phase === 'checking') {
    const listen = (
      <>
        <button type="button" onClick={props.onHearMine} className={OUTLINE}>
          <Play size={18} />
          {t('hearMine')}
        </button>
        <button type="button" onClick={props.onHearNative} className={OUTLINE}>
          <Speaker size={18} />
          {t('hearNative')}
        </button>
      </>
    );
    leftExtra = <div className="order-3 flex gap-2.5 ipad:hidden">{listen}</div>;
    const failedCard = (
      <div
        role="alert"
        className="flex flex-col gap-2.5 rounded-[20px] border border-gold-border bg-gold-soft px-4 py-3.5 text-left text-gold-soft-text ipad:w-[420px]"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">{speak('failed.title')}</span>
          <span className="text-[14px] leading-[1.4]">{speak('failed.body')}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={props.onCheckAgain}
            className="h-11 rounded-[14px] bg-forest px-4 text-[14px] font-bold text-white"
          >
            {speak('failed.checkAgain')}
          </button>
          <button
            type="button"
            onClick={props.onRecordAgain}
            className="flex h-11 items-center rounded-[14px] border border-border bg-surface px-4 text-[14px] font-bold text-forest"
          >
            {speak('failed.recordAgain')}
          </button>
        </div>
      </div>
    );
    controls = (
      <div className="order-5 mt-auto flex flex-col items-center gap-3 ipad:mt-0 ipad:flex-grow ipad:justify-center">
        {props.failed ? (
          failedCard
        ) : (
          <div
            role="status"
            aria-label={t('checkingLabel')}
            className="flex flex-col items-center gap-3"
          >
            <span className="hidden font-display text-[24px] font-semibold ipad:block">
              {t('checking')}
            </span>
            <span className="flex gap-2" aria-hidden="true">
              {[0, 1, 2].map((k) => (
                <span
                  key={k}
                  className="pron-dot h-3 w-3 rounded-full bg-forest"
                  style={{ animationDelay: `${k * 0.2}s` }}
                />
              ))}
            </span>
            <span className="text-[15px] font-semibold text-muted-foreground ipad:font-normal">
              {t('usually')}
            </span>
          </div>
        )}
        <div className="hidden w-[420px] gap-3 ipad:flex">{listen}</div>
      </div>
    );
  } else if (phase === 'result' && props.result) {
    const r = props.result;
    const last = props.nextWord == null;
    leftExtra = (
      <>
        <div
          className={gcn(
            'order-1 flex flex-col items-center gap-1 text-center ipad:items-start ipad:gap-3 ipad:text-left',
          )}
        >
          <span
            className={gcn(
              'rounded-xl px-3 py-1 text-[13px] font-bold ipad:px-3.5 ipad:py-[5px] ipad:text-[14px]',
              r.passed
                ? 'bg-[var(--pron-pass)] text-forest'
                : 'bg-[var(--pron-tip)] text-[var(--pron-almost-text)]',
            )}
          >
            {r.passed
              ? t('pollinatedBadge', { n })
              : t('almost', { ok: r.wobbly.filter((w) => !w).length, n })}
          </span>
          <span className="font-display text-[30px] font-semibold leading-[1.1] ipad:text-[40px]">
            {r.passed
              ? t('cleanCrossing')
              : t('wobbly', { count: r.wobbly.filter(Boolean).length })}
          </span>
          <span className="hidden text-[18px] text-muted-foreground ipad:block">
            <b lang="en" className="text-text">
              {props.word}
            </b>
            {props.ipa ? ` · ${props.ipa}` : null}
          </span>
        </div>
        {r.passed ? (
          <>
            {/* Compare first, then the explanation (Dylan, 2026-10-24). */}
            <div className="order-3 flex gap-2 ipad:mt-3 ipad:gap-2.5">
              <button
                type="button"
                onClick={props.onHearMine}
                className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[16px] border border-border bg-surface text-[15px] font-bold text-forest ipad:rounded-[18px] ipad:text-[16px]"
              >
                <Play size={18} />
                {t('playMine')}
              </button>
              <button
                type="button"
                onClick={props.onHearNative}
                className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[16px] bg-[var(--pron-pass)] text-[15px] font-bold text-forest ipad:rounded-[18px] ipad:text-[16px]"
              >
                <Speaker size={18} />
                {t('native')}
              </button>
            </div>
            <div className="order-3 flex items-center gap-3 rounded-[20px] border border-border bg-surface px-4 py-3.5 ipad:gap-4 ipad:rounded-[22px] ipad:border-[var(--pron-card-line)] ipad:bg-[var(--pron-card-sunken)] ipad:p-5">
              <Flower className="h-10 w-10 ipad:h-12 ipad:w-12" />
              <span className="text-[15px] leading-[1.4] ipad:text-[17px] ipad:leading-[1.45]">
                {t.rich('pollinatedBody', { word: props.word, b: boldWord })}
              </span>
            </div>
          </>
        ) : r.first ? (
          <div className="order-3 flex flex-col gap-2.5 rounded-[20px] border border-border bg-surface px-4 py-3.5 ipad:mt-3 ipad:gap-3 ipad:rounded-[22px] ipad:border-[var(--pron-card-line)] ipad:bg-[var(--pron-card-sunken)] ipad:p-5">
            <div className="flex items-baseline gap-2.5 ipad:gap-3">
              <span lang="en" className="font-display text-[24px] font-semibold ipad:text-[32px]">
                {r.first.text}
              </span>
              <span className="text-[14px] text-muted-foreground ipad:text-[16px]">
                {r.first.heardIpa ? t('soundedLike', { ipa: r.first.heardIpa }) : t('notClear')}
              </span>
            </div>
            {r.first.ipa ? (
              <span className="text-[15px] leading-[1.45] ipad:text-[17px]">
                {t.rich('tryLike', { ipa: r.first.ipa, b: bold })}
              </span>
            ) : null}
            <div className="flex gap-2 ipad:gap-2.5">
              <button
                type="button"
                onClick={props.onHearSyllable}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--pron-pass)] text-[14px] font-bold text-forest ipad:h-[52px] ipad:rounded-[18px] ipad:border ipad:border-border ipad:bg-surface ipad:text-[16px]"
              >
                <span className="hidden ipad:inline">
                  <Speaker size={20} />
                </span>
                {t('hearSyllable', { syllable: r.first.text })}
              </button>
              <button
                type="button"
                onClick={props.onHearMine}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border border-border bg-bg text-[14px] font-bold text-muted-foreground ipad:h-[52px] ipad:rounded-[18px] ipad:bg-surface ipad:text-[16px] ipad:text-forest"
              >
                <span className="hidden ipad:inline">
                  <Play size={18} />
                </span>
                {t('hearMine')}
              </button>
            </div>
          </div>
        ) : null}
      </>
    );
    controls = (
      <div className="order-5 mt-auto flex flex-col gap-1.5 ipad:mt-0 ipad:flex-grow ipad:justify-end ipad:gap-2.5">
        {r.passed ? (
          last ? (
            <Link href={props.closeHref} className={PRIMARY}>
              {t('backToBed')}
            </Link>
          ) : (
            <>
              <button type="button" onClick={props.onNext} className={PRIMARY}>
                {t('nextBeeWord', { word: props.nextWord ?? '' })}
              </button>
              <Link href={props.closeHref} className={LINK}>
                {t('backToBed')}
              </Link>
            </>
          )
        ) : (
          <>
            <button type="button" onClick={props.onTryAgain} className={PRIMARY}>
              {t('tryAgain')}
            </button>
            {last ? (
              <Link href={props.closeHref} className={LINK}>
                {t('backToBed')}
              </Link>
            ) : (
              <button type="button" onClick={props.onNext} className={LINK}>
                {t('nextBee')}
              </button>
            )}
          </>
        )}
      </div>
    );
  } else if (phase === 'notHeard') {
    const reason = props.reason ?? 'quiet';
    const key = `notHeard.${reason}` as const;
    const tip1 = t(`${key}.tip1`);
    const tip2 = reason === 'other' ? t('notHeard.other.tip2', { stressed: big }) : t(`${key}.tip2`);
    const tip1Ipad = reason === 'quiet' ? t('notHeard.quiet.tip1Ipad') : tip1;
    const tip2Ipad = reason === 'noisy' ? t('notHeard.noisy.tip2Ipad') : tip2;
    const tipRow = (k: 1 | 2, phone: string, ipad: string) => (
      <div
        className={gcn(
          'flex items-center gap-3 py-2.5 ipad:gap-3.5 ipad:py-3',
          k === 2 && 'border-t border-[var(--pron-card-line)]',
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--pron-pass)] text-[13px] font-bold text-forest ipad:h-[30px] ipad:w-[30px] ipad:text-[14px]">
          {k}
        </span>
        <span className="text-[14px] leading-[1.4] ipad:text-[16px]">
          <span className="ipad:hidden">{phone}</span>
          <span className="hidden ipad:inline">{ipad}</span>
        </span>
      </div>
    );
    leftExtra = (
      <>
        <div className="rise order-2 flex flex-col gap-1.5 text-center ipad:gap-3 ipad:text-left">
          <span className="font-display text-[28px] font-semibold leading-[1.15] ipad:text-[38px] ipad:leading-[1.12]">
            {t(`${key}.title`)}
          </span>
          <span className="text-[15px] leading-[1.45] text-muted-foreground ipad:text-[18px]">
            {reason === 'other'
              ? t('notHeard.other.body', { heard: props.heard ?? '', word: props.word })
              : t(`${key}.body`)}
          </span>
        </div>
        <div className="order-3 rounded-[20px] border border-border bg-surface px-3.5 py-1 ipad:mt-2 ipad:rounded-[22px] ipad:border-[var(--pron-card-line)] ipad:bg-[var(--pron-card-sunken)] ipad:px-[18px]">
          {tipRow(1, tip1, tip1Ipad)}
          {tipRow(2, tip2, tip2Ipad)}
        </div>
        <span className="order-4 text-center text-[13px] font-semibold text-success ipad:mt-auto ipad:text-left ipad:text-[15px]">
          {t('doesntCount')}
        </span>
      </>
    );
    controls = (
      <div className="order-5 mt-auto flex flex-col gap-1.5 ipad:mt-0 ipad:flex-grow ipad:justify-end ipad:gap-2.5">
        <button type="button" onClick={props.onTryAgain} className={PRIMARY}>
          <Mic size={20} className="ipad:h-[22px] ipad:w-[22px]" />
          {t('tryAgain')}
        </button>
        <button type="button" onClick={props.onHearFirst} className={LINK}>
          {t('hearFirst')}
        </button>
      </div>
    );
  }

  const wordCard = phase === 'result' || phase === 'notHeard' ? null : (
    <>
      {wordBlock}
      {hearButtons}
      {playFailed}
      {tip}
    </>
  );

  return (
    <div
      className={gcn(
        'mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col bg-bg px-[18px] pb-[26px] pt-5 text-text',
        phase === 'result' ? 'gap-[14px]' : 'gap-4',
        'ipad:max-w-none ipad:gap-[22px] ipad:px-12 ipad:py-8',
      )}
    >
      {header}
      <div className="contents ipad:grid ipad:min-h-0 ipad:w-full ipad:max-w-[1060px] ipad:flex-grow ipad:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ipad:gap-6 ipad:self-center">
        <div className="contents ipad:flex ipad:flex-col ipad:gap-3 ipad:rounded-[32px] ipad:border ipad:border-border ipad:bg-surface ipad:p-8 ipad:shadow-[0_6px_0_var(--color-card-lift)]">
          {wordCard}
          {leftExtra}
        </div>
        <div className="contents ipad:flex ipad:min-h-0 ipad:flex-col ipad:gap-[18px]">
          {pondPart}
          {controls}
        </div>
      </div>
    </div>
  );
}

function CloseLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <IconButton asChild aria-label={label} className={className}>
      <Link href={href}>
        <CloseIcon width={20} height={20} />
      </Link>
    </IconButton>
  );
}
