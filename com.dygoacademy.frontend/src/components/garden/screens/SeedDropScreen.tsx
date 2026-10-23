'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { SeedKind } from '@/types';

import { buttonClassName } from '../buttonStyles';
import { gcn } from '../cn';
import { CloseIcon } from '../icons';
import { IconButton } from '../IconButton';

/**
 * S1 Fruit drops seeds (canvas "Adult · Seeds & Harvest", values from
 * docs/design/garden/reference/S1-seed-drop.html).
 *
 * Close · "<bed> bed" → forest card: the fruit word's plant (its first 3
 * letters on the fruit) drops the seeds into the soil → Fraunces 28
 * "<word> dropped N seeds", where they'll be planted → one card per seed
 * (kind tag, the word in Fraunces 21 with its part of speech for a word
 * family member or synonym, the meaning, Hear) → "Your bed grows from 5
 * words to 7" → Plant them now · Later.
 *
 * Props only; SeedDropLive owns the data.
 */
export interface SeedDropScreenProps {
  closeHref: string;
  plantHref: string;
  laterHref: string;
  word: string;
  bed: string;
  wordsBefore: number;
  wordsAfter: number;
  seeds: ReadonlyArray<{
    id: string;
    word: string;
    kind: SeedKind;
    partOfSpeech: string | null;
    meaning: string | null;
    audioSrc: string | null;
  }>;
}

const KIND: Record<SeedKind, string> = {
  pairing: 'bg-primary-soft text-primary-text',
  family: 'bg-water-soft text-water-deep',
  synonym: 'bg-forest-wash text-forest',
};

export function SeedDropScreen({
  closeHref,
  plantHref,
  laterHref,
  word,
  bed,
  wordsBefore,
  wordsAfter,
  seeds,
}: SeedDropScreenProps) {
  const t = useTranslations('screens.seedDrop');

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] overflow-hidden bg-bg px-[18px] pb-[26px] pt-5 text-text">
      <div className="flex items-center gap-3">
        <IconButton asChild aria-label={t('close')}>
          <Link href={closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
        <span className="grow text-center text-[12px] font-bold uppercase tracking-[0.1em] text-success">
          {t('overline', { bed })}
        </span>
        <span className="w-11" aria-hidden="true" />
      </div>

      <div className="overflow-hidden rounded-hero bg-forest">
        <DropArt
          label={t('artLabel', { word, count: seeds.length })}
          fruitLabel={t('fruit')}
          letters={word.slice(0, 3).toUpperCase()}
          seeds={Math.min(seeds.length, 2)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-semibold leading-[1.15]">
          {t.rich('title', {
            count: seeds.length,
            word: () => <span lang="en">{word}</span>,
          })}
        </h1>
        <span className="text-[15px] leading-[1.4] text-muted-foreground">
          {t('subtitle', { bed })}
        </span>
      </div>

      <ul className="seed-cards-rise flex flex-col gap-2.5">
        {seeds.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-card border border-border bg-surface py-[14px] pl-4 pr-[14px]"
          >
            <div className="flex min-w-0 grow flex-col gap-[3px]">
              <span
                className={gcn(
                  'overline-label self-start rounded-lg px-2 py-[3px] text-[11px] font-extrabold',
                  KIND[s.kind],
                )}
              >
                {t(`kind.${s.kind}`)}
              </span>
              <span lang="en" className="font-display text-[21px] font-semibold">
                {s.word}
                {s.kind !== 'pairing' && s.partOfSpeech ? (
                  <>
                    {' '}
                    <span className="font-body text-[14px] font-medium text-muted-foreground">
                      {s.partOfSpeech}
                    </span>
                  </>
                ) : null}
              </span>
              {s.meaning ? (
                <span lang="en" className="text-[14px] text-muted-foreground">
                  {s.meaning}
                </span>
              ) : null}
            </div>
            <HearButton src={s.audioSrc} label={t('hear', { word: s.word })} />
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 rounded-tile bg-forest-wash px-3 py-2.5 text-[13px] text-forest">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 21 V11" />
          <path d="M12 14 C7 14 5 10 5 7 C9 7 12 9 12 14 Z" />
          <path d="M12 12 C17 12 19 8 19 5 C15 5 12 7 12 12 Z" />
        </svg>
        <span>
          {t.rich('grows', {
            before: wordsBefore,
            after: wordsAfter,
            b: (chunks) => <b>{chunks}</b>,
          })}
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        <Link
          href={plantHref}
          className={buttonClassName('primary', {
            className: 'h-[56px] text-[16px] md:max-w-none',
          })}
        >
          {t('plantNow')}
        </Link>
        <Link
          href={laterHref}
          className="self-center p-2 text-[14px] font-semibold text-muted-foreground underline"
        >
          {t('later')}
        </Link>
      </div>
    </div>
  );
}

/** S1's Hear button: 44px, sage, the canvas speaker. */
function HearButton({ src, label }: { src: string | null; label: string }) {
  const audio = React.useRef<HTMLAudioElement | null>(null);
  React.useEffect(() => () => audio.current?.pause(), []);
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!src}
      onClick={() => {
        if (!src) return;
        audio.current?.pause();
        audio.current = new Audio(src);
        void audio.current.play().catch(() => undefined);
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-on-forest-muted text-forest active:scale-95 disabled:opacity-50"
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
        <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
        <path d="M16 9 A4 4 0 0 1 16 15" />
      </svg>
    </button>
  );
}

/** The canvas drop (354 × 190): the swaying fruit plant and its falling seeds. */
function DropArt({
  label,
  fruitLabel,
  letters,
  seeds,
}: {
  label: string;
  fruitLabel: string;
  letters: string;
  seeds: number;
}) {
  return (
    <svg width="100%" viewBox="0 0 354 190" role="img" aria-label={label} className="block h-auto">
      <rect x="0" y="152" width="354" height="38" fill="var(--color-forest-deep)" />
      <path
        d="M0 152 Q 90 146 177 152 T 354 152"
        fill="none"
        stroke="var(--pond-wave)"
        strokeWidth="2"
      />
      <g className="seed-sway">
        <path
          d="M150 152 V58"
          stroke="var(--stage-sprout-leaf)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M150 120 C134 118 124 108 128 96 C142 96 150 106 150 120 Z"
          fill="var(--stage-sprout-leaf)"
        />
        <path
          d="M150 98 C166 96 176 86 172 74 C158 74 150 84 150 98 Z"
          fill="var(--stage-sprout)"
        />
        <circle cx="150" cy="48" r="20" fill="var(--stage-flower)" />
        <path
          d="M150 28 C152 22 158 20 162 22"
          stroke="var(--stage-tree-canopy)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <text
          x="150"
          y="53"
          textAnchor="middle"
                    fontWeight="700"
          fontSize="12"
          fill="var(--color-text)"
        >
          {letters}
        </text>
      </g>
      <path
        d="M170 60 Q 200 80 214 140"
        fill="none"
        stroke="var(--stage-sprout)"
        strokeWidth="1.5"
        strokeDasharray="3 5"
      />
      {seeds > 1 ? (
        <path
          d="M174 66 Q 240 76 262 140"
          fill="none"
          stroke="var(--stage-sprout)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />
      ) : null}
      <g className="seed-fall">
        <ellipse cx="214" cy="146" rx="7" ry="4.5" fill="var(--stage-dropped-seed)" />
        <path
          d="M214 142 C214 136 218 133 222 132"
          stroke="var(--stage-sprout-leaf)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      {seeds > 1 ? (
        <g className="seed-fall" style={{ animationDelay: '0.35s' }}>
          <ellipse cx="262" cy="146" rx="7" ry="4.5" fill="var(--stage-dropped-seed)" />
          <path
            d="M262 142 C262 136 266 133 270 132"
            stroke="var(--stage-sprout-leaf)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ) : null}
      <text
        x="24"
        y="30"
                fontWeight="700"
        fontSize="11"
        letterSpacing="1.2"
        fill="var(--stage-sprout)"
      >
        {fruitLabel}
      </text>
    </svg>
  );
}
