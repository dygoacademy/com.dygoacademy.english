'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { useExclusiveAudio, type ExclusiveClip } from '@/hooks/useExclusiveAudio';
import {
  buildResultViewModel,
  resultDetail,
  type P4Action,
  type P4Cta,
  type PronunciationResult,
} from '@/lib/pronunciation/pronunciationResult';
import { p1Tip } from '@/lib/pronunciation/tip';
import { ipaSegments, stoneText } from '@/lib/speaking/ipa';
import { PRON_MAX_MS } from '@/lib/speaking/pronounce';
import type { SpeakingSyllable } from '@/types';

import { gcn } from '../cn';
import { CloseIcon } from '../icons';
import { IconButton } from '../IconButton';
import { MatchRing, MirrorWave, VoiceMeterComb } from './CombMeters';
import { HoneycombBoard } from './HoneycombBoard';
import { ListenCard, type ListenButton } from './ListenCard';
import { useMsg } from './useMsg';

/**
 * Pronunciation, the honeycomb (docs/specs/Pronunciation-honeycomb-
 * implementation-plan.md §3; boards PronStones*.dc.html, 2026-10-25): P1
 * say the word, P2 recording, P3 checking, P4 result and P2b couldn't hear
 * you. Every phase draws the same HoneycombBoard in its own mode, and the
 * sounds go through one ListenCard pattern (one sound at a time,
 * useExclusiveAudio).
 *
 * Phone and iPad are one tree: on a phone the two column wrappers are
 * `display: contents`, so their parts make one column in the boards'
 * order; with the iPad layout on (`ipad:`) the board side sits on the left
 * and the listen card, tips and actions on the right.
 */
export type PronPhase = 'say' | 'recording' | 'checking' | 'result' | 'notHeard';
export type PronNotHeardReason = 'quiet' | 'noisy' | 'other';
/** The screen's sounds: P1 Normal / Slowly, P3 and P4 Native / Your try. */
export type PronSound = 'normal' | 'slow' | 'native' | 'you';
export type PronClips = Record<PronSound, ExclusiveClip>;
/** Where a sound was started (analytics: pron_word_played). */
export type PronScreenName = 'P1' | 'P3' | 'P4';

export interface PronounceScreenProps {
  phase: PronPhase;
  word: string;
  ipa: string | null;
  meaning: string | null;
  meaningLang?: string;
  syllables: readonly SpeakingSyllable[];
  /** 0-based word in this visit, of `total`. */
  index: number;
  total: number;
  /** The bed's name, for the iPad header ("Pronunciation · Environment"). */
  topic?: string | null;
  closeHref: string;
  /** What each listen button plays (`src` null: the button shows the error line). */
  clips: PronClips;
  /** A sound started playing (analytics: pron_word_played). */
  onPlayed?: (voice: 'native' | 'you', screen: PronScreenName) => void;
  /** P1. */
  onMic?: () => void;
  /** P1: a mic notice (denied, unsupported) in place of the hint; `micAvailable` false hides the mic. */
  notice?: React.ReactNode;
  micAvailable?: boolean;
  /** P2: cells the voice has reached, the smoothed mic level, whether the take runs (after the beep), the time since the beep. */
  reached?: number;
  level?: number;
  started?: boolean;
  elapsedMs?: number;
  onStop?: () => void;
  onCancel?: () => void;
  /** P3: the check failed ("Check again / Record again"). */
  failed?: boolean;
  onCheckAgain?: () => void;
  onRecordAgain?: () => void;
  /** P4: the scored word, the mirror waveform's bars (null: a skeleton row) and each cell's share of the word. */
  result?: PronunciationResult | null;
  waves?: { native: readonly number[] | null; mine: readonly number[] | null };
  shares?: readonly number[];
  onAction?: (action: P4Action) => void;
  /** P2b. */
  reason?: PronNotHeardReason;
  heard?: string;
  onTryAgain?: () => void;
  onHearFirst?: () => void;
}

const MicGlyph = ({ size, className }: { size: number; className?: string }) => (
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

const ARROW = 'M5 12 H19 M13 6 L19 12 L13 18';
const MIC =
  'M12 3 a3 3 0 0 1 3 3 v5 a3 3 0 0 1 -6 0 v-5 a3 3 0 0 1 3 -3 M6 11 a6 6 0 0 0 12 0 M12 17 V21';
const BED = 'M4 20 V9 L12 4 L20 9 V20';
const SKIP = 'M5 6 L13 12 L5 18 Z M15 6 V18';

function Icon({ d, size, stroke }: { d: string; size: number; stroke: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/** The 4 s ring round the stop button: full at the beep, empty at PRON_MAX_MS. */
function TimerRing({ size, r, elapsedMs }: { size: number; r: number; elapsedMs: number }) {
  const len = Math.round(2 * Math.PI * r);
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden="true">
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

/** "/ˈmɪt.ɪ.ɡeɪt/" with the stressed syllable picked out (the iPad word). */
function IpaStressed({ ipa }: { ipa: string }) {
  const segs = ipaSegments(ipa);
  if (segs.length === 0) return <>{ipa}</>;
  return (
    <>
      {'/'}
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
      {'/'}
    </>
  );
}

const MAIN =
  'cta flex h-[58px] items-center justify-center gap-2.5 rounded-[20px] bg-primary px-4 text-[17px] font-bold text-white no-underline shadow-[0_4px_0_var(--color-primary-shadow)] ipad:h-[60px]';
const LINK =
  'flex min-h-11 items-center justify-center gap-1.5 self-center px-3 text-[15px] font-semibold text-muted-foreground no-underline';

export function PronounceScreen(props: PronounceScreenProps) {
  const t = useTranslations('screens.pronounce');
  const speak = useTranslations('screens.speak');
  const msg = useMsg();
  const audio = useExclusiveAudio();
  const { phase, syllables, word } = props;
  const recording = phase === 'recording';
  const reached = props.reached ?? 0;
  const syls = syllables.map(stoneText);
  const loud = stoneText(syllables.find((s) => s.stressed) ?? syllables[0] ?? { text: '', stressed: false });
  const bold = (chunks: React.ReactNode) => <b lang="en">{chunks}</b>;

  /** A listen button: stops it while it loads or plays, else plays it (and stops the other). */
  const tap = (sound: PronSound, screen: PronScreenName) => {
    const was = audio.stateOf(sound);
    void audio.toggle(sound, props.clips[sound]);
    if (was !== 'loading' && was !== 'playing' && props.clips[sound].src) {
      props.onPlayed?.(sound === 'you' ? 'you' : 'native', screen);
    }
  };
  const listenTexts = {
    loadingText: t('listen.loading'),
    errorText: t('listen.error'),
  };
  const compareButtons = (subs: boolean): readonly [ListenButton, ListenButton] => [
    {
      key: 'native',
      label: t('btn.native'),
      sub: subs ? t('btn.nativeSub') : undefined,
      tone: 'green',
      aria: t('btn.nativeAria', { word }),
    },
    {
      key: 'you',
      label: t('btn.you'),
      sub: subs ? t('btn.youSub') : undefined,
      tone: 'clay',
      aria: t('btn.youAria', { word }),
    },
  ];

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
        // P3 has no close (it's 1–2 s): a spacer keeps the eyebrow centred.
        <span className="h-11 w-11 shrink-0" />
      ) : (
        <IconButton asChild aria-label={t('close')}>
          <Link href={props.closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
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

  // ── The word (P1, P2, P3) ──
  const prompt =
    phase === 'recording'
      ? reached === 0
        ? t('p2.promptBeep')
        : t('p2.promptGoing')
      : phase === 'checking'
        ? t('p3.sub')
        : null;
  const wordBlock =
    phase === 'say' || phase === 'recording' || phase === 'checking' ? (
      <div className="flex flex-col items-center gap-0.5 text-center ipad:items-start ipad:gap-2 ipad:text-left">
        <span lang="en" className="font-display text-[44px] font-semibold leading-[1.05] ipad:text-[64px] ipad:leading-[1.02]">
          {word}
        </span>
        {prompt ? (
          <span
            className={gcn('text-[16px] ipad:text-[18px]', recording ? 'font-semibold text-primary' : 'text-muted-foreground')}
            aria-live={recording ? 'polite' : undefined}
          >
            {prompt}
          </span>
        ) : (
          <>
            <span className="text-[16px] text-muted-foreground ipad:hidden">
              {[props.ipa, props.meaning].filter(Boolean).join(' · ')}
            </span>
            {props.ipa ? (
              <span className="hidden text-[22px] text-muted-foreground ipad:block">
                <IpaStressed ipa={props.ipa} />
              </span>
            ) : null}
            {props.meaning ? (
              <span lang={props.meaningLang} className="hidden text-[17px] leading-[1.45] text-example ipad:block">
                {props.meaning}
              </span>
            ) : null}
          </>
        )}
      </div>
    ) : null;

  // ── P4 view model ──
  const vm = React.useMemo(() => (props.result ? buildResultViewModel(props.result) : null), [props.result]);
  const [selected, setSelected] = React.useState(vm?.selected ?? -1);
  const [shownFor, setShownFor] = React.useState(vm);
  if (vm !== shownFor) {
    // A new result: back to its default selection (nothing on a pass, else the weakest cell).
    setShownFor(vm);
    setSelected(vm?.selected ?? -1);
  }

  // ── The board ──
  let board: React.ReactNode;
  if (phase === 'result' && vm && props.result) {
    const d = resultDetail(vm, props.result, selected);
    board = (
      <HoneycombBoard
        mode="result"
        syllables={props.result.syllables}
        title={t('comb.title.result')}
        passLine={t('comb.passLine', { mark: vm.passMark })}
        label={msg(vm.boardLabel)}
        result={{
          cells: vm.cells.map((c) => ({ score: c.score, status: c.status, aria: msg(c.aria) })),
          selected,
          onSelect: setSelected,
          detail: { tag: msg(d.tag), tone: d.tone, text: msg(d.text) },
        }}
      />
    );
  } else {
    const mode =
      phase === 'say' ? 'empty' : phase === 'recording' ? 'live' : phase === 'checking' ? 'checking' : 'dim';
    const title =
      mode === 'empty'
        ? t('comb.title.empty')
        : mode === 'live'
          ? reached === 0
            ? t('comb.title.liveWait')
            : t('comb.title.live')
          : mode === 'checking'
            ? t('comb.title.checking')
            : t('comb.title.dim');
    const label =
      mode === 'empty'
        ? t('comb.label.empty', { n: syls.length, syls: syls.join(', '), loud })
        : mode === 'live'
          ? reached === 0
            ? t('comb.label.liveWait')
            : t('comb.label.live', { parts: syls.slice(0, reached).join(', ') })
          : mode === 'checking'
            ? t('comb.label.checking')
            : t('comb.label.dim', { syls: syls.join(', ') });
    board = (
      <HoneycombBoard
        mode={mode}
        syllables={syllables}
        title={title}
        label={label}
        reached={reached}
        className={phase === 'notHeard' ? 'mt-2 ipad:mt-0' : undefined}
      />
    );
  }

  // ── Each phase's parts: `left` beside the board on iPad, `right` the other column ──
  let left: React.ReactNode = null;
  let right: React.ReactNode = null;

  if (phase === 'say') {
    const tip = p1Tip(syllables);
    right = (
      <>
        <ListenCard
          eyebrow={t('p1.listenEyebrow')}
          title={t('p1.listenTitle')}
          buttons={[
            { key: 'normal', label: t('p1.normal'), sub: t('p1.normalSub'), tone: 'green', aria: t('p1.normalAria', { word }) },
            { key: 'slow', label: t('p1.slow'), sub: t('p1.slowSub'), tone: 'green', aria: t('p1.slowAria', { word }) },
          ]}
          stateOf={audio.stateOf}
          onTap={(k) => tap(k as PronSound, 'P1')}
          playing="solid"
          playingText={t('listen.playingStop')}
          {...listenTexts}
        />
        <div className="rounded-2xl bg-[var(--pron-tip)] px-3.5 py-3 text-[14px] leading-[1.45] text-[var(--pron-tip-text)] ipad:rounded-[18px] ipad:px-[18px] ipad:py-3.5 ipad:text-[16px]">
          {t.rich(tip.key as Parameters<typeof t.rich>[0], { ...tip.values, b: bold })}
        </div>
        <div className="mt-auto flex flex-col items-center gap-2.5 ipad:gap-3">
          {props.notice}
          {props.micAvailable === false ? null : (
            <>
              {props.notice ? null : (
                <span className="text-[15px] font-semibold text-muted-foreground ipad:text-[17px]">{t('p1.ctaHint')}</span>
              )}
              <button
                type="button"
                onClick={() => {
                  audio.stop();
                  props.onMic?.();
                }}
                aria-label={t('startSpeaking')}
                className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-primary text-white shadow-[0_5px_0_var(--color-primary-shadow)] ipad:h-24 ipad:w-24"
              >
                <MicGlyph size={34} className="ipad:h-[38px] ipad:w-[38px]" />
              </button>
              {props.notice ? null : (
                <span className="text-center text-[12px] text-muted-foreground ipad:text-[13px]">
                  <span className="ipad:hidden">{t('p1.ctaMic')}</span>
                  <span className="hidden ipad:inline">{t('p1.ctaMicIpad')}</span>
                </span>
              )}
            </>
          )}
        </div>
      </>
    );
  } else if (phase === 'recording') {
    const started = props.started ?? false;
    right = (
      <>
        <VoiceMeterComb
          level={props.level ?? 0}
          recording={started}
          label={t('p2.voiceLabel')}
          status={started ? t('p2.voiceRec') : t('p2.voiceStarting')}
        />
        <div className="mt-auto flex flex-col items-center gap-2.5 ipad:gap-3">
          <span className="text-[15px] font-bold text-primary ipad:text-[17px]">
            {reached === 0 ? t('sayNow', { word }) : t('listening')}
          </span>
          <div className="relative flex h-[108px] w-[108px] items-center justify-center ipad:h-[124px] ipad:w-[124px]">
            <span className="pron-ring absolute left-3 top-3 h-[84px] w-[84px] rounded-full bg-[var(--pron-ring)] ipad:left-3.5 ipad:top-3.5 ipad:h-24 ipad:w-24" />
            <span className="ipad:hidden">
              <TimerRing size={108} r={46} elapsedMs={props.elapsedMs ?? 0} />
            </span>
            <span className="hidden ipad:block">
              <TimerRing size={124} r={57} elapsedMs={props.elapsedMs ?? 0} />
            </span>
            <button
              type="button"
              onClick={props.onStop}
              aria-label={t('stopRecording')}
              className="relative flex h-[84px] w-[84px] items-center justify-center rounded-full bg-primary text-white ipad:h-24 ipad:w-24"
            >
              <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="3" fill="#FFFFFF" />
              </svg>
            </button>
          </div>
          <span className="text-center text-[13px] text-muted-foreground ipad:text-[14px]">{t('p2.stopHint')}</span>
        </div>
      </>
    );
  } else if (phase === 'checking') {
    right = (
      <>
        <ListenCard
          eyebrow={t('p3.listenEyebrow')}
          title={t('p3.listenTitle')}
          buttons={compareButtons(true)}
          stateOf={audio.stateOf}
          onTap={(k) => tap(k as PronSound, 'P3')}
          playing="tint"
          {...listenTexts}
        />
        <div className="mt-auto flex flex-col items-center gap-3">
          {props.failed ? (
            <div
              role="alert"
              className="flex w-full flex-col gap-2.5 rounded-[20px] border border-gold-border bg-gold-soft px-4 py-3.5 text-left text-gold-soft-text"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{speak('failed.title')}</span>
                <span className="text-[14px] leading-[1.4]">{speak('failed.body')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
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
          ) : (
            <div role="status" aria-label={t('checkingLabel')} className="flex flex-col items-center gap-3">
              <span className="flex gap-2" aria-hidden="true">
                {[0, 1, 2].map((k) => (
                  <span
                    key={k}
                    className="pron-dot h-3 w-3 rounded-full bg-forest"
                    style={{ animationDelay: `${k * 0.2}s` }}
                  />
                ))}
              </span>
              <span className="text-[15px] font-semibold text-muted-foreground">{t('p3.wait')}</span>
            </div>
          )}
        </div>
      </>
    );
  } else if (phase === 'notHeard') {
    const reason = props.reason ?? 'quiet';
    const key = `notHeard.${reason}` as const;
    const tip1 = t(`${key}.tip1`);
    const tip2 = reason === 'other' ? t('p2b.otherTip2', { stressed: loud }) : t(`notHeard.${reason}.tip2`);
    const tip1Ipad = reason === 'quiet' ? t('notHeard.quiet.tip1Ipad') : tip1;
    const tip2Ipad = reason === 'noisy' ? t('notHeard.noisy.tip2Ipad') : tip2;
    const tipRow = (k: 1 | 2, phone: string, ipad: string) => (
      <div className={gcn('flex items-center gap-3 py-2.5 ipad:gap-3.5 ipad:py-3', k === 2 && 'border-t border-[var(--pron-card-line)]')}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--pron-pass)] text-[13px] font-bold text-forest ipad:h-[30px] ipad:w-[30px] ipad:text-[14px]">
          {k}
        </span>
        <span className="text-[14px] leading-[1.4] ipad:text-[16px]">
          <span className="ipad:hidden">{phone}</span>
          <span className="hidden ipad:inline">{ipad}</span>
        </span>
      </div>
    );
    left = (
      <div className="rise flex flex-col gap-1.5 text-center ipad:gap-3 ipad:text-left">
        <span className="font-display text-[28px] font-semibold leading-[1.15] ipad:text-[38px] ipad:leading-[1.12]">
          {t(`${key}.title`)}
        </span>
        <span className="text-[15px] leading-[1.45] text-muted-foreground ipad:text-[18px]">
          {reason === 'other' ? t('notHeard.other.body', { heard: props.heard ?? '', word }) : t(`${key}.body`)}
        </span>
      </div>
    );
    right = (
      <>
        <div className="rounded-[20px] border border-border bg-surface px-3.5 py-1 ipad:rounded-[22px] ipad:px-[18px]">
          {tipRow(1, tip1, tip1Ipad)}
          {tipRow(2, tip2, tip2Ipad)}
        </div>
        <span className="text-center text-[13px] font-semibold text-success ipad:text-left ipad:text-[15px]">
          {t('p2b.noCount')}
        </span>
        <div className="mt-auto flex flex-col gap-1">
          <button type="button" onClick={props.onTryAgain} className={MAIN}>
            <MicGlyph size={20} />
            {t('tryAgain')}
          </button>
          <button type="button" onClick={props.onHearFirst} className={LINK}>
            {t('hearFirst')}
          </button>
        </div>
      </>
    );
  } else if (phase === 'result' && vm && props.result) {
    const pass = vm.kind !== 'retry';
    const shares =
      props.shares && props.shares.length === vm.cells.length
        ? props.shares
        : vm.cells.map(() => 1 / Math.max(1, vm.cells.length));
    const zoneStart = vm.weak >= 0 ? shares.slice(0, vm.weak).reduce((a, b) => a + b, 0) : 0;
    const zone =
      vm.weak >= 0 ? { start: zoneStart, end: zoneStart + shares[vm.weak], tag: vm.cells[vm.weak].text } : null;
    const cta = (c: P4Cta, kind: 'main' | 'link') => {
      const d =
        kind === 'main'
          ? c.action === 'tryAgain'
            ? MIC
            : ARROW
          : c.action === 'backToBed'
            ? BED
            : c.action === 'skip'
              ? SKIP
              : MIC;
      const icon = <Icon d={d} size={kind === 'main' ? 20 : 16} stroke={kind === 'main' ? 2.6 : 2.2} />;
      const text = msg(c);
      const body = kind === 'main' ? <>{text}{icon}</> : <>{icon}{text}</>;
      const cls = kind === 'main' ? MAIN : LINK;
      return c.action === 'backToBed' ? (
        <Link href={props.closeHref} className={cls} onClick={() => audio.stop()}>
          {body}
        </Link>
      ) : (
        <button
          type="button"
          className={cls}
          onClick={() => {
            audio.stop();
            props.onAction?.(c.action);
          }}
        >
          {body}
        </button>
      );
    };
    left = (
      <div className={gcn('flex flex-col gap-1.5 px-1 ipad:gap-2.5', pass && 'pron-pop')}>
        <span
          className={gcn(
            'self-start rounded-[10px] px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-[.06em] ipad:text-[13px]',
            pass ? 'bg-[var(--pron-pass)] text-forest' : 'bg-[var(--pron-tip)] text-[var(--pron-almost-text)]',
          )}
        >
          {msg(vm.badge)}
        </span>
        <span className="font-display text-[30px] font-semibold leading-[1.1] ipad:text-[40px]">{msg(vm.headline)}</span>
        <span className="text-[15px] leading-[1.4] text-soft-text ipad:text-[18px]">{msg(vm.sub)}</span>
      </div>
    );
    right = (
      <>
        <div className="flex flex-col gap-2.5 rounded-[22px] border border-border bg-surface px-3.5 pb-3.5 pt-3">
          <div className="flex items-center gap-3">
            <MirrorWave
              native={props.waves?.native ?? null}
              mine={props.waves?.mine ?? null}
              zone={zone}
              label={zone ? t('p4.wave.weak', { syl: zone.tag }) : t('p4.wave.match')}
            />
            <MatchRing value={vm.overall} tone={vm.ringTone} label={t('p4.ring', { pct: vm.overall })} />
          </div>
          <ListenCard
            bare
            buttons={compareButtons(false)}
            stateOf={audio.stateOf}
            onTap={(k) => tap(k as PronSound, 'P4')}
            playing="tint"
            {...listenTexts}
          />
        </div>
        <div className="mt-auto flex flex-col items-stretch gap-0.5">
          {cta(vm.cta.main, 'main')}
          {cta(vm.cta.link, 'link')}
        </div>
      </>
    );
  }

  return (
    <div
      data-screen={phase === 'say' ? 'P1' : phase === 'recording' ? 'P2' : phase === 'checking' ? 'P3' : phase === 'result' ? 'P4' : 'P2b'}
      className={gcn(
        'mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col bg-bg px-[18px] pb-[26px] pt-5 text-text',
        phase === 'result' ? 'gap-[14px]' : 'gap-4',
        'ipad:max-w-none ipad:gap-[22px] ipad:px-12 ipad:py-8',
      )}
    >
      {header}
      <div className="contents ipad:grid ipad:w-full ipad:max-w-[1060px] ipad:flex-grow ipad:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] ipad:gap-8 ipad:self-center">
        <div className={gcn('contents ipad:flex ipad:flex-col ipad:gap-5', phase === 'say' || phase === 'recording' || phase === 'checking' ? 'ipad:justify-center' : 'ipad:justify-start')}>
          {phase === 'notHeard' ? (
            <>
              {board}
              {left}
            </>
          ) : (
            <>
              {wordBlock}
              {left}
              {board}
            </>
          )}
        </div>
        <div className="contents ipad:flex ipad:min-h-0 ipad:flex-col ipad:gap-4 ipad:pt-2">{right}</div>
      </div>
    </div>
  );
}
