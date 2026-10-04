'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { SpeakingStage } from '@/types';

import { CloseIcon } from '../icons';
import { IconButton } from '../IconButton';
import { MiniWave } from '../speaking/MiniWave';
import { SpeakingPlant } from '../speaking/SpeakingPlant';
import { useTipText } from '../speaking/tips';

export interface SpeakDoneWord {
  word: string;
  stage: SpeakingStage;
  /** Best score this session. */
  pct: number;
  levels: readonly number[];
}

export interface SpeakDoneScreenProps {
  words: SpeakDoneWord[];
  /** The session's most common tip, if any needs work ("Pattern to watch"). */
  pattern: { tipKey: string; tipParams?: Record<string, string>; ipa: string | null } | null;
  closeHref: string;
}

/** A best score at or above this shows as a green pill on SP4, below as gold (decision S8-b). */
export const DONE_GREEN_FROM = 80;

/** SP4 · Done (SpeakDone.dc.html). Visual only: no SRS change, no mission (D5). */
export function SpeakDoneScreen({ words, pattern, closeHref }: SpeakDoneScreenProps) {
  const t = useTranslations('screens.speak');
  const tipText = useTipText();
  const n = words.length;
  const tip = pattern ? tipText(pattern.tipKey, pattern.tipParams, pattern.ipa) : null;

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg px-4 pb-7 pt-5 text-text">
      <div className="flex justify-end">
        <IconButton asChild aria-label={t('close')}>
          <Link href={closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[12px] font-bold uppercase tracking-[.1em] text-success">
          {t('done.kicker')}
        </span>
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">
          {t('done.title', { n })}
        </h1>
        <span className="text-[15px] text-muted-foreground">{t('done.sub')}</span>
      </div>

      <div
        role="img"
        aria-label={t('done.gardenLabel', { n })}
        className="flex items-end justify-around overflow-hidden rounded-[24px] bg-forest px-3 pt-3"
        style={{ boxShadow: 'inset 0 -14px 0 var(--color-forest-deep)' }}
      >
        {words.map((w, i) => (
          <SpeakingPlant key={i} stage={w.stage} size={40} />
        ))}
      </div>

      <div className="rounded-[22px] border border-border bg-surface px-4 py-1.5">
        {words.map((w, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-divider' : ''}`}
          >
            <MiniWave levels={w.levels} />
            <span lang="en" className="flex-grow text-[16px] font-bold">
              {w.word}
            </span>
            <span
              className={`rounded-[10px] px-2.5 py-[3px] text-[13px] font-bold ${
                w.pct >= DONE_GREEN_FROM
                  ? 'bg-on-forest-muted text-forest'
                  : 'bg-gold-soft text-gold-soft-text'
              }`}
            >
              {t('done.best', { pct: w.pct })}
            </span>
          </div>
        ))}
      </div>

      {tip ? (
        <div className="flex items-center gap-2.5 rounded-control bg-water-soft px-3.5 py-3 text-[14px] text-water-text">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 19 V5" />
            <path d="M6 11 L12 5 L18 11" />
          </svg>
          <span>
            <b>{t('done.pattern')}</b> {tip.title}
          </span>
        </div>
      ) : null}

      <Link
        href={closeHref}
        className="mt-auto flex h-[58px] items-center justify-center rounded-[18px] bg-primary text-[17px] font-bold text-white shadow-press-primary"
      >
        {t('backToGarden')}
      </Link>
    </div>
  );
}
