'use client';

import { useTranslations } from 'next-intl';

import type { SpeakingResult } from '@/lib/speaking/envelopeScorer';
import type { SpeakingSessionItem, SpeakingTimings } from '@/types';

import { Spinner } from '../Spinner';
import { CompareWaveform, type CompareView } from '../speaking/CompareWaveform';
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
  timings: SpeakingTimings | null;
  ipa: string | null;
  /** Null while scoring. */
  result: SpeakingResult | null;
  view: CompareView;
  onView: (view: CompareView) => void;
  playing: 'native' | 'you' | null;
  playKey?: number;
  onPlayNative: () => void;
  onPlayYou: () => void;
  onTryAgain: () => void;
  onNext: () => void;
}

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5 L19 12 L8 19 Z" fill="currentColor" />
  </svg>
);

/** SP3 · Compare (SpeakCompare.dc.html). */
export function SpeakCompareScreen(props: SpeakCompareScreenProps) {
  const { item, timings, ipa, result, view } = props;
  const t = useTranslations('screens.speak');
  const tipText = useTipText();
  const reason = useMarkReason();
  const tokens = item.sentence.trim().split(/\s+/);
  const nativeSeconds = timings?.duration ?? 0;
  const tip = result ? tipText(result.tipKey, result.tipParams, ipa) : null;
  const playingMs =
    props.playing === 'native'
      ? nativeSeconds * 1000
      : props.playing === 'you' && result
        ? result.userDurationMs
        : null;

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg px-4 pb-7 pt-5 text-text">
      <SpeakHeader index={props.index} total={props.total} closeHref={props.closeHref} />

      {result === null ? (
        <div role="status" className="flex flex-grow items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-hero border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                {t('yourSentence')}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {t('durations', {
                  you: (result.userDurationMs / 1000).toFixed(1),
                  native: nativeSeconds.toFixed(1),
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
              native={result.envelopes.native}
              user={result.envelopes.user}
              view={view}
              target={targetSpan(timings, item.target_index)}
              playingMs={playingMs}
              playKey={props.playKey}
              label={t(view === 'overlay' ? 'waveLabel.overlay' : 'waveLabel.stacked')}
            />
            <WordMarks words={tokens} marks={result.wordMarks} reasonText={(m) => reason(m, ipa)} />
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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={props.onPlayNative}
              aria-pressed={props.playing === 'native'}
              className="flex h-12 items-center justify-center gap-2 rounded-control border border-[var(--color-sprout-border)] bg-[#F1F6EF] text-[15px] font-bold text-forest"
            >
              <PlayIcon />
              {t('playNative')}
            </button>
            <button
              type="button"
              onClick={props.onPlayYou}
              aria-pressed={props.playing === 'you'}
              className="flex h-12 items-center justify-center gap-2 rounded-control border border-[#EBC7B6] bg-[#FBEFE9] text-[15px] font-bold text-primary-text"
            >
              <PlayIcon />
              {t('playYou')}
            </button>
          </div>
        </>
      )}

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
          disabled={result === null}
          className="h-14 rounded-[18px] bg-primary text-[16px] font-bold text-white shadow-press-primary disabled:opacity-60"
        >
          {t('nextWord')}
        </button>
      </div>
    </div>
  );
}
