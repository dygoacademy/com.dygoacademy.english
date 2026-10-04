'use client';

import { useTranslations } from 'next-intl';

import { ipaCore, ipaSegments, stressedSpelling } from '@/lib/speaking/ipa';
import { followAlongIndex, formatClock } from '@/lib/speaking/session';
import type { SpeakingSessionItem, SpeakingTimings } from '@/types';

import { LiveWaveform } from '../speaking/LiveWaveform';
import { SpeakHeader } from '../speaking/SpeakHeader';
import { SpeakSentence } from '../speaking/SpeakSentence';

export interface SpeakRecordingScreenProps {
  item: SpeakingSessionItem;
  index: number;
  total: number;
  closeHref: string;
  /** Close in place instead of following closeHref (the review sheet). */
  onClose?: () => void;
  timings: SpeakingTimings | null;
  ipa: string | null;
  nativeLevels: readonly number[] | null;
  liveLevels: readonly number[];
  elapsedMs: number;
  /** 3 · 2 · 1 before the beep; null while recording. */
  countdown?: number | null;
  /** Tapping the countdown skips straight to the beep. */
  onSkipCountdown?: () => void;
  onStop: () => void;
  onCancel: () => void;
}

const MicIcon = ({ size }: { size: number }) => (
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
    <path d="M5 11 A7 7 0 0 0 19 11" />
    <path d="M12 18 V21" />
  </svg>
);

/** "/ˈ" + "mɪt" + ".ɪ.ɡeɪt/": the IPA split around the stressed syllable (bolded by the message). */
function ipaAroundStress(ipa: string | null): { before: string; stressed: string; after: string } {
  const segs = ipaSegments(ipa);
  const at = segs.findIndex((s) => s.stressed);
  if (at < 0) return { before: `/${ipaCore(ipa)}/`, stressed: '', after: '' };
  const seg = segs[at];
  const marks = seg.text.slice(0, seg.text.length - seg.syllable.length);
  return {
    before: `/${segs
      .slice(0, at)
      .map((s) => s.text)
      .join('')}${marks}`,
    stressed: seg.syllable,
    after: `${segs
      .slice(at + 1)
      .map((s) => s.text)
      .join('')}/`,
  };
}

/**
 * SP2 · Speaking (SpeakRecording.dc.html, handover v2). Opens with a
 * 3 · 2 · 1 countdown big over the pale native shape ("Get ready",
 * tap to start now) while the mic waits grey ("Starting soon"); after the
 * beep the sentence follows along, the learner's clay bars grow over the
 * native shape, the clock shows the time so far, and the stop button
 * appears ("or just pause, it stops by itself").
 */
export function SpeakRecordingScreen(props: SpeakRecordingScreenProps) {
  const { item, timings, ipa } = props;
  const t = useTranslations('screens.speak');
  const counting = props.countdown != null;
  const tokens = item.sentence.trim().split(/\s+/);
  const reached = counting ? tokens.length : followAlongIndex(timings, props.elapsedMs / 1000);
  const syllable = stressedSpelling(item.word, ipa);
  const bold = (chunks: React.ReactNode) => <b>{chunks}</b>;

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg px-4 pb-7 pt-5 text-text">
      <SpeakHeader
        index={props.index}
        total={props.total}
        closeHref={props.closeHref}
        onClose={props.onClose}
      />

      <div className="flex flex-col gap-1.5 rounded-[22px] border border-border bg-surface px-4 pb-3.5 pt-3">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">
          {t('saySentence')}
        </span>
        <SpeakSentence tokens={tokens} targetIndex={item.target_index} reached={reached} />
      </div>

      {counting ? (
        <button
          type="button"
          onClick={props.onSkipCountdown}
          aria-label={t('countdownButton')}
          className="relative flex flex-col gap-2.5 rounded-hero border border-border bg-surface px-4 py-[18px] text-left text-text"
        >
          <span className="text-[13px] font-bold text-forest">{t('getReady')}</span>
          <LiveWaveform
            nativeLevels={props.nativeLevels ?? []}
            nativeDuration={timings?.duration ?? 0}
            liveLevels={[]}
            ghostOpacity={0.3}
          />
          <span className="pointer-events-none absolute inset-x-0 top-[46px] flex h-[170px] items-center justify-center">
            <span
              key={props.countdown}
              aria-live="assertive"
              className="speak-pop flex h-[112px] w-[112px] items-center justify-center rounded-full bg-forest font-display text-[60px] font-semibold text-white"
            >
              {props.countdown}
            </span>
          </span>
          <span className="text-[13px] text-muted-foreground">{t('countdownHint')}</span>
        </button>
      ) : (
        <div className="rise flex flex-col gap-2.5 rounded-hero border border-border bg-surface px-4 py-[18px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] font-bold text-primary-text">
              <span className="relative h-2.5 w-2.5">
                <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping" />
                <span className="absolute inset-0 rounded-full bg-primary" />
              </span>
              {t('recording')}
            </span>
            <span className="text-[13px] font-bold tabular-nums text-muted-foreground" role="timer">
              {formatClock(props.elapsedMs)}
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
      )}

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
          <span>
            {t.rich('stressTip', {
              word: item.word,
              ...ipaAroundStress(ipa),
              syllable,
              b: bold,
            })}
          </span>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col items-center gap-2.5">
        {counting ? (
          <>
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-track text-muted-foreground">
              <MicIcon size={34} />
            </div>
            <span className="text-[15px] font-bold text-muted-foreground">{t('startingSoon')}</span>
          </>
        ) : (
          <>
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
            <span className="-mt-1.5 text-[13px] text-muted-foreground">{t('pauseStops')}</span>
          </>
        )}
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
