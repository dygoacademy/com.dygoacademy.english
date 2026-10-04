'use client';

import { useTranslations } from 'next-intl';

import { followAlongIndex, formatClock } from '@/lib/speaking/session';
import { stressedSyllable } from '@/lib/speaking/ipa';
import type { SpeakingSessionItem, SpeakingTimings } from '@/types';

import { LiveWaveform } from '../speaking/LiveWaveform';
import { SpeakHeader } from '../speaking/SpeakHeader';
import { SpeakSentence } from '../speaking/SpeakSentence';

export interface SpeakRecordingScreenProps {
  item: SpeakingSessionItem;
  index: number;
  total: number;
  closeHref: string;
  timings: SpeakingTimings | null;
  ipa: string | null;
  nativeLevels: readonly number[] | null;
  liveLevels: readonly number[];
  elapsedMs: number;
  /** The time after the slash ("0:02 / 0:05"). */
  targetMs: number;
  onStop: () => void;
  onCancel: () => void;
}

/** SP2 · Recording (SpeakRecording.dc.html). */
export function SpeakRecordingScreen(props: SpeakRecordingScreenProps) {
  const { item, timings, ipa } = props;
  const t = useTranslations('screens.speak');
  const tokens = item.sentence.trim().split(/\s+/);
  const reached = followAlongIndex(timings, props.elapsedMs / 1000);
  const syllable = stressedSyllable(ipa);

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg px-4 pb-7 pt-5 text-text">
      <SpeakHeader index={props.index} total={props.total} closeHref={props.closeHref} />

      <div className="flex flex-col gap-1.5 rounded-[22px] border border-border bg-surface px-4 pb-3.5 pt-3">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">
          {t('saySentence')}
        </span>
        <SpeakSentence tokens={tokens} targetIndex={item.target_index} reached={reached} />
      </div>

      <div className="flex flex-col gap-2.5 rounded-hero border border-border bg-surface px-4 py-[18px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] font-bold text-primary-text">
            <span className="relative h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping" />
              <span className="absolute inset-0 rounded-full bg-primary" />
            </span>
            {t('recording')}
          </span>
          <span className="text-[13px] font-bold tabular-nums text-muted-foreground" role="timer">
            {t('timer', {
              elapsed: formatClock(props.elapsedMs),
              max: formatClock(props.targetMs),
            })}
          </span>
        </div>
        <LiveWaveform
          nativeLevels={props.nativeLevels ?? []}
          nativeDuration={timings?.duration ?? 0}
          liveLevels={props.liveLevels}
          label={t('waveLabel.live')}
        />
        <span className="text-[13px] text-muted-foreground">{t('fillShape')}</span>
      </div>

      {ipa && syllable ? (
        <div className="flex items-center gap-2.5 rounded-[14px] bg-gold-soft px-3 py-2.5 text-[13px] text-gold-soft-text">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 19 V5" />
            <path d="M6 11 L12 5 L18 11" />
          </svg>
          <span>{t('stressTip', { word: item.word, ipa, syllable })}</span>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col items-center gap-2.5">
        <div className="relative h-[88px] w-[88px]">
          <span className="absolute inset-0 rounded-full bg-primary opacity-50 motion-safe:animate-ping" />
          <button
            type="button"
            onClick={props.onStop}
            aria-label={t('stopButton')}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-primary text-white shadow-[0_5px_0_var(--color-primary-shadow)]"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" />
            </svg>
          </button>
        </div>
        <span className="text-[15px] font-bold">{t('tapToStop')}</span>
        <button
          type="button"
          onClick={props.onCancel}
          className="py-1.5 text-[14px] font-semibold text-muted-foreground"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
