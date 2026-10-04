'use client';

import { useTranslations } from 'next-intl';

import type { SpeakingAccent, SpeakingSessionItem } from '@/types';
import { SPEAKING_ACCENTS } from '@/types';
import type { PlayerRate } from '@/hooks/usePlayer';
import { forAccent } from '@/lib/speaking/session';

import { Chip } from '../Chip';
import { SpeakHeader } from '../speaking/SpeakHeader';
import { SpeakSentence } from '../speaking/SpeakSentence';
import { SpeakWordCard } from '../speaking/SpeakWordCard';
import { Waveform } from '../speaking/Waveform';
import { targetSpan } from '../speaking/waveformBars';

export interface SpeakListenScreenProps {
  item: SpeakingSessionItem;
  index: number;
  total: number;
  closeHref: string;
  accent: SpeakingAccent;
  onAccent: (accent: SpeakingAccent) => void;
  rate: PlayerRate;
  onRate: (rate: PlayerRate) => void;
  playing: boolean;
  onPlay: () => void;
  /** Native envelope for the waveform (null while it decodes). */
  nativeLevels: readonly number[] | null;
  /** Restarts the playing sweep. */
  playKey?: number;
  onMic: () => void;
  /** Hidden when this browser can't record (T7). */
  micAvailable?: boolean;
  /** Replaces the hint line, e.g. an error from the mic (T7 states build on this). */
  notice?: React.ReactNode;
}

const MicIcon = () => (
  <svg
    width="38"
    height="38"
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

const SpeakerIcon = () => (
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
    <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
    <path d="M16.5 8.5 C18 10 18 14 16.5 15.5" />
    <path d="M19 6 C22 9 22 15 19 18" />
  </svg>
);

/** SP1 · Listen (SpeakListen.dc.html). */
export function SpeakListenScreen(props: SpeakListenScreenProps) {
  const { item, accent, rate, playing } = props;
  const t = useTranslations('screens.speak');
  const { timings, ipa } = forAccent(item, accent);
  const available = SPEAKING_ACCENTS.filter((a) =>
    a === 'UK' ? item.audio_uk_url : item.audio_us_url,
  );
  const tokens = item.sentence.trim().split(/\s+/);
  const overline = 'text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground';

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg px-4 pb-7 pt-5 text-text">
      <SpeakHeader index={props.index} total={props.total} closeHref={props.closeHref} />

      <SpeakWordCard
        word={item.word}
        ipa={ipa}
        cefr={item.cefr_level}
        partOfSpeech={item.part_of_speech}
        translation={item.meaning_translation}
        translationLang={item.meaning_locale?.slice(0, 2)}
        definition={item.definition_en}
      />

      <div className="flex flex-col gap-1.5 rounded-[22px] border border-border bg-surface px-4 pb-3.5 pt-3">
        <span className={overline}>{t('saySentence')}</span>
        <SpeakSentence tokens={tokens} targetIndex={item.target_index} />
      </div>

      <div className="flex flex-col gap-3 rounded-[24px] border border-border bg-surface px-4 pb-4 pt-3.5">
        <div className="flex items-center justify-between">
          <span className={overline}>{t('nativeSpeaker')}</span>
          <div className="flex gap-1.5">
            {available.map((a) => (
              <Chip
                key={a}
                selected={accent === a}
                className="h-9 px-3 text-[13px] font-bold"
                onClick={() => props.onAccent(a)}
              >
                {t(a === 'UK' ? 'accent.uk' : 'accent.us')}
              </Chip>
            ))}
          </div>
        </div>
        <Waveform
          levels={props.nativeLevels ?? []}
          target={targetSpan(timings, item.target_index)}
          playingMs={playing && timings ? (timings.duration * 1000) / rate : null}
          playKey={props.playKey}
          label={t('waveLabel.listen')}
        />
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={props.onPlay}
            className="flex h-12 items-center gap-2 rounded-3xl bg-forest pl-3.5 pr-[18px] text-[15px] font-bold text-white"
          >
            <SpeakerIcon />
            {playing ? t('playing') : t('play')}
          </button>
          <div className="ml-auto flex gap-1.5">
            {([1, 0.75] as const).map((r) => (
              <Chip
                key={r}
                selected={rate === r}
                className="h-9 px-3 text-[13px] font-bold"
                onClick={() => props.onRate(r)}
              >
                {t(r === 1 ? 'speed.normal' : 'speed.slow')}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col items-center gap-2.5">
        {props.notice ?? (
          <span className="text-[14px] text-muted-foreground">{t('listenHint')}</span>
        )}
        {props.micAvailable !== false ? (
          <button
            type="button"
            onClick={props.onMic}
            aria-label={t('micButton')}
            className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-primary text-white shadow-[0_5px_0_var(--color-primary-shadow)] active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-primary-shadow)]"
          >
            <MicIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}
