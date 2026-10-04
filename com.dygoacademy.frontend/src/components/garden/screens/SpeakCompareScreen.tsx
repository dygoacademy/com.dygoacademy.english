'use client';

import { useFormatter, useTranslations } from 'next-intl';

import type { CheckStatus, ShownResult } from '@/lib/speaking/check';
import type { SpeakingAccent, SpeakingSessionItem, SpeakingTimings } from '@/types';

import { CompareWaveform, type CompareBand, type CompareView } from '../speaking/CompareWaveform';
import { SpeakHeader } from '../speaking/SpeakHeader';
import { StageScore } from '../speaking/StageScore';
import { useMarkReason, useTipText } from '../speaking/tips';
import { targetSpan } from '../speaking/waveformBars';
import { WordMarks } from '../speaking/WordMarks';

export interface SpeakCompareScreenProps {
  item: SpeakingSessionItem;
  index: number;
  total: number;
  closeHref: string;
  /** Close in place instead of following closeHref (the review sheet). */
  onClose?: () => void;
  timings: SpeakingTimings | null;
  ipa: string | null;
  accent: SpeakingAccent;
  /** Drawn on the phone at once, before the check comes back. */
  envelopes: { native: readonly number[]; user: readonly number[] };
  /** The learner's voice length (s · native s), known at once too. */
  userDurationMs: number;
  /** The result area: checking → done | failed (handover v2 SP3). */
  status: CheckStatus;
  /** Set when `status` is `done`. */
  result: ShownResult | null;
  /** The learner's initial on "Play your recording" (canvas: "M" for Minh). */
  initial: string;
  view: CompareView;
  onView: (view: CompareView) => void;
  playing: 'native' | 'you' | null;
  playKey?: number;
  onPlayNative: () => void;
  onPlayYou: () => void;
  onCheckAgain: () => void;
  onRecordAgain: () => void;
  onTryAgain: () => void;
  onNext: () => void;
  /** Replaces "Next word" (the sheet: "Back to the card"). */
  nextLabel?: string;
}

const SpeakerIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
    <path d="M16.5 8.5 C18 10 18 14 16.5 15.5" />
    <path d="M19 6 C22 9 22 15 19 18" />
  </svg>
);

/**
 * SP3 · Compare (SpeakCompare.dc.html, handover v2). Opens straight after
 * the recording stops: the waveforms, durations and Play buttons work at
 * once; the result area shows **checking** (plain sentence, shimmer card,
 * "Your recording is checked, then deleted."), then **done** (word marks,
 * amber bands, garden-stage score, one tip) or **failed** ("Couldn't
 * check this one", Check again / Record again).
 */
export function SpeakCompareScreen(props: SpeakCompareScreenProps) {
  const { item, timings, ipa, result, view, status } = props;
  const t = useTranslations('screens.speak');
  const format = useFormatter();
  const tipText = useTipText();
  const reason = useMarkReason();
  const tokens = item.sentence.trim().split(/\s+/);
  const nativeSeconds = timings?.duration ?? 0;
  const done = status === 'done' && result !== null;
  const seconds = (s: number) =>
    format.number(s, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const tip = done
    ? tipText(result.tipKey, result.tipParams, ipa, {
        tokens,
        marks: result.wordMarks,
        targetIndex: item.target_index,
      })
    : null;
  const bands: CompareBand[] = done
    ? result.wordMarks
        .filter((m) => !m.ok)
        .flatMap((m) => {
          const span = targetSpan(timings, m.index);
          return span ? [{ ...span, target: m.index === item.target_index }] : [];
        })
    : [];
  const playingMs =
    props.playing === 'native'
      ? nativeSeconds * 1000
      : props.playing === 'you'
        ? props.userDurationMs
        : null;

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg px-4 pb-7 pt-5 text-text">
      <SpeakHeader
        index={props.index}
        total={props.total}
        closeHref={props.closeHref}
        onClose={props.onClose}
      />

      <div className="rise flex flex-col gap-3 rounded-hero border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            {t('yourSentence')}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {t('durations', {
              you: seconds(props.userDurationMs / 1000),
              native: seconds(nativeSeconds),
            })}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label={t('view.label')}
          className="grid grid-cols-2 gap-1 rounded-xl bg-track p-[3px]"
        >
          {(['overlay', 'stacked'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => props.onView(v)}
              className={`h-[34px] rounded-[10px] text-[13px] font-bold ${
                view === v
                  ? 'bg-surface text-forest shadow-[0_1px_0_var(--color-border)]'
                  : 'text-muted-foreground'
              }`}
            >
              {t(`view.${v}`)}
            </button>
          ))}
        </div>
        <CompareWaveform
          native={props.envelopes.native}
          user={props.envelopes.user}
          view={view}
          bands={bands}
          playingMs={playingMs}
          playKey={props.playKey}
          label={t(view === 'overlay' ? 'waveLabel.overlay' : 'waveLabel.stacked')}
        />
        {done ? (
          <WordMarks
            words={tokens}
            marks={result.wordMarks}
            reasonText={(m, word) => reason(m, word, ipa)}
          />
        ) : (
          <p lang="en" className="m-0 font-display text-[18px] leading-[1.45] text-speak-faded">
            {item.sentence}
          </p>
        )}
        <div className="flex gap-3.5 text-[12px] text-muted-foreground">
          {(
            [
              ['native', 'bg-stage-sprout'],
              ['you', 'bg-primary'],
              ['needsWork', 'bg-gold-light'],
            ] as const
          ).map(([key, swatch]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-[3px] ${swatch}`} />
              {t(`legend.${key}`)}
            </span>
          ))}
        </div>
      </div>

      {done ? (
        <>
          <StageScore
            stage={result.stage}
            title={t('match', { stage: t(`stage.${result.stage}`), pct: result.score })}
            scale={t.rich('stageScale', { b: (chunks) => <b>{chunks}</b> })}
          />
          {tip ? (
            <div className="flex flex-col gap-1 rounded-[18px] border border-gold-border bg-gold-soft px-3.5 py-3 text-gold-soft-text">
              <span className="text-[15px] font-bold">{tip.title}</span>
              <span className="text-[14px] leading-[1.4]">{tip.body}</span>
            </div>
          ) : null}
        </>
      ) : status === 'failed' ? (
        <div
          role="alert"
          className="flex flex-col gap-2.5 rounded-[20px] border border-gold-border bg-gold-soft px-4 py-3.5 text-gold-soft-text"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold">{t('failed.title')}</span>
            <span className="text-[14px] leading-[1.4]">{t('failed.body')}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={props.onCheckAgain}
              className="h-11 rounded-[14px] bg-forest px-4 text-[14px] font-bold text-white"
            >
              {t('failed.checkAgain')}
            </button>
            <button
              type="button"
              onClick={props.onRecordAgain}
              className="flex h-11 items-center rounded-[14px] border border-border bg-surface px-4 text-[14px] font-bold text-forest"
            >
              {t('failed.recordAgain')}
            </button>
          </div>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-2.5 rounded-[20px] border border-border bg-surface px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <span className="speak-shim h-[52px] w-[52px] flex-shrink-0 rounded-full bg-track" />
            <div className="flex flex-grow flex-col gap-2">
              <span className="text-[15px] font-bold text-forest">{t('checking')}</span>
              <span className="speak-shim h-2 w-[70%] rounded bg-track" />
            </div>
          </div>
          <span className="speak-shim h-2 w-[92%] rounded bg-track" />
          <span className="speak-shim h-2 w-[60%] rounded bg-track" />
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11 V8 A4 4 0 0 1 16 8 V11" />
            </svg>
            {t('privacy')}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={props.onPlayNative}
          aria-label={t('playNativeLabel')}
          aria-pressed={props.playing === 'native'}
          className={`flex h-[52px] items-center gap-2 rounded-2xl border border-sprout-border pl-2 pr-3 text-left text-[14px] font-bold text-forest ${
            props.playing === 'native' ? 'bg-on-forest-muted' : 'bg-[#F1F6EF]'
          }`}
        >
          <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-success text-[#F1F6EF]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12 H21" />
              <path d="M12 3 C15 6 15 18 12 21 C9 18 9 6 12 3 Z" />
            </svg>
          </span>
          <span className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap">
            {props.playing === 'native'
              ? t('playingShort')
              : t('nativeAccent', { accent: t(`accent.${props.accent === 'UK' ? 'uk' : 'us'}`) })}
          </span>
          <SpeakerIcon />
        </button>
        <button
          type="button"
          onClick={props.onPlayYou}
          aria-label={t('playYouLabel')}
          aria-pressed={props.playing === 'you'}
          className={`flex h-[52px] items-center gap-2 rounded-2xl border border-[#EBC7B6] pl-2 pr-3 text-left text-[14px] font-bold text-primary-text ${
            props.playing === 'you' ? 'bg-rating-again' : 'bg-[#FBEFE9]'
          }`}
        >
          <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-primary font-display text-[17px] font-semibold text-white">
            {props.initial}
          </span>
          <span className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap">
            {props.playing === 'you' ? t('playingShort') : t('playYou')}
          </span>
          <SpeakerIcon />
        </button>
      </div>

      <div className="mt-auto grid grid-cols-[1fr_1.4fr] gap-2">
        <button
          type="button"
          onClick={props.onTryAgain}
          className="flex h-14 items-center justify-center gap-2 rounded-[18px] border border-border bg-surface text-[16px] font-bold text-forest"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11 A7 7 0 0 0 19 11" />
            <path d="M12 18 V21" />
          </svg>
          {t('tryAgain')}
        </button>
        <button
          type="button"
          onClick={props.onNext}
          className="h-14 rounded-[18px] bg-primary text-[16px] font-bold text-white shadow-press-primary"
        >
          {props.nextLabel ?? t('nextWord')}
        </button>
      </div>
    </div>
  );
}
