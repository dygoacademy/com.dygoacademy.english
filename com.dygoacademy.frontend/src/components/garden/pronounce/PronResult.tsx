'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { StoneState } from '@/lib/speaking/pron-config';
import { p4Buttons, type P4Action } from '@/lib/speaking/pron-result';
import { stoneText, type PronResultView } from '@/lib/speaking/pronounce';

import { gcn } from '../cn';
import { CloseIcon } from '../icons';
import { IconButton } from '../IconButton';
import { SoundButton } from '../SoundButton';
import type { PronClip } from './PronounceScreen';
import { ResultStones } from './ResultStones';

/**
 * P4 v2, phone (PronStonesResult.dc.html, 2026-10-25; values in
 * docs/design/garden/pronunciation.md): badge, headline and advice for a
 * pass, an almost perfect pass or a retry; the stones with a chip per
 * syllable (a tap plays that syllable, native then you; the selected one
 * says "Native → you"); the whole word Native / You; one big button and a
 * link (the P4 button table, `p4Buttons`).
 */
export interface PronResultProps {
  word: string;
  /** 0-based bee of `total` this round. */
  index: number;
  total: number;
  view: PronResultView;
  /** Per stone: the target IPA (the scorer's syllable) and what it sounded like. */
  syllables: readonly { ipa: string; heard_ipa: string | null }[];
  /** The next word, or null on the last bee. */
  nextWord: string | null;
  closeHref: string;
  nativeClip: PronClip;
  mineClip: PronClip;
  /** Lengths for the pills ("0.8s"); empty while unknown. */
  nativeS: number | null;
  mineS: number | null;
  /** The selected chip (state lives in the controller, so a tap and the sound agree). */
  selected: number;
  onChip: (index: number) => void;
  onAction: (action: P4Action) => void;
  onPlayed?: (voice: 'native' | 'you') => void;
}

const ARROW = 'M5 12 H19 M13 6 L19 12 L13 18';
const MIC =
  'M12 3 a3 3 0 0 1 3 3 v5 a3 3 0 0 1 -6 0 v-5 a3 3 0 0 1 3 -3 M6 11 a6 6 0 0 0 12 0 M12 17 V21';
const BED = 'M4 20 V9 L12 4 L20 9 V20';
const SKIP = 'M5 6 L13 12 L5 18 Z M15 6 V18';

/** The syllable's IPA as the board shows it: "/tɪ/", stress marks dropped. */
export const slashIpa = (ipa: string) => `/${ipa.replace(/[ˈˌ/]/g, '')}/`;

const CHIP: Record<StoneState | 'selected', { bg: string; fg: string; border: string; dashed?: boolean }> = {
  clean: { bg: 'bg-[var(--pron-chip)]', fg: 'text-on-forest-muted', border: 'border-[var(--pron-chip-line)]' },
  close: { bg: 'bg-gold-soft', fg: 'text-gold-soft-text', border: 'border-[var(--stone-close-edge)]', dashed: true },
  wobbly: { bg: 'bg-primary-soft', fg: 'text-primary-text', border: 'border-[var(--stone-wobbly)]' },
  selected: { bg: 'bg-bg', fg: 'text-text', border: 'border-[var(--stone-selected)]' },
};

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

export function PronResult(props: PronResultProps) {
  const t = useTranslations('screens.pronounce');
  const r = useTranslations('screens.pronounce.result');
  const { view } = props;
  const n = view.stones.length;
  const pass = view.outcome !== 'retry';
  const last = props.nextWord == null;
  const weakIndex = view.first?.index ?? -1;
  const weak = view.first?.text ?? '';
  const target = weakIndex >= 0 ? slashIpa(props.syllables[weakIndex]?.ipa ?? '') : '';
  const heard = weakIndex >= 0 ? props.syllables[weakIndex]?.heard_ipa : null;

  const badge =
    view.outcome === 'retry' ? r('badgeRetry', { ok: view.clean, n }) : r('badgePass', { n });
  const headline =
    view.outcome === 'pass' ? r('headPass') : view.outcome === 'almost' ? r('headAlmost') : r('headRetry');
  const sub =
    view.outcome === 'pass'
      ? r('subPass', { word: props.word })
      : view.outcome === 'almost'
        ? r('subAlmost', { syl: weak, ipa: target })
        : heard
          ? r('subRetryHeard', { syl: weak, heard: slashIpa(heard), ipa: target })
          : r('subRetryShort', { syl: weak, ipa: target });
  const label =
    view.outcome === 'pass'
      ? r('stonesPass', { n })
      : view.outcome === 'almost'
        ? r('stonesAlmost', { syl: weak })
        : r('stonesRetry', { syl: weak });

  const buttons = p4Buttons(view.outcome, last);
  const LABEL: Record<P4Action, string> = {
    nextBee: r('nextBee', { word: props.nextWord ?? '' }),
    backToBed: r('backToBed'),
    tryAgain: r('tryAgain'),
    sayAgain: r('sayAgain'),
    polish: r('polish', { syl: weak }),
    skip: r('skip'),
  };
  const mainIcon = buttons.main === 'tryAgain' ? MIC : ARROW;
  const linkIcon = buttons.link === 'backToBed' ? BED : buttons.link === 'skip' ? SKIP : MIC;
  const MAIN =
    'cta flex h-[60px] items-center justify-center gap-2.5 rounded-[20px] bg-primary px-4 text-[17px] font-bold text-white no-underline shadow-[0_4px_0_var(--color-primary-shadow)]';
  const LINK =
    'flex min-h-11 items-center gap-1.5 self-center px-3 text-[15px] font-semibold text-muted-foreground no-underline';
  const main =
    buttons.main === 'backToBed' ? (
      <Link href={props.closeHref} className={MAIN}>
        {LABEL.backToBed}
        <Icon d={mainIcon} size={20} stroke={2.6} />
      </Link>
    ) : (
      <button type="button" onClick={() => props.onAction(buttons.main)} className={MAIN}>
        {LABEL[buttons.main]}
        <Icon d={mainIcon} size={20} stroke={2.6} />
      </button>
    );
  const link =
    buttons.link === 'backToBed' ? (
      <Link href={props.closeHref} className={LINK}>
        <Icon d={linkIcon} size={16} stroke={2.2} />
        {LABEL.backToBed}
      </Link>
    ) : (
      <button type="button" onClick={() => props.onAction(buttons.link)} className={LINK}>
        <Icon d={linkIcon} size={16} stroke={2.2} />
        {LABEL[buttons.link]}
      </button>
    );
  const secs = (v: number | null) => (v ? t('seconds', { s: v.toFixed(1) }) : '');

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg px-[18px] pb-[26px] pt-5 text-text">
      <div className="flex items-center gap-3">
        <IconButton asChild aria-label={t('close')}>
          <Link href={props.closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
        <span className="flex-grow text-[12px] font-bold uppercase tracking-[.1em] text-success">
          {t('eyebrow')}
        </span>
        <span className="text-[13px] font-bold text-muted-foreground">
          {t('beeCount', { n: Math.min(props.total, props.index + 1), total: props.total })}
        </span>
      </div>

      <div className={gcn('flex flex-col gap-1.5 px-1', pass && 'pron-pop')}>
        <span
          className={gcn(
            'self-start rounded-[10px] px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-[.06em]',
            pass ? 'bg-[var(--pron-pass)] text-forest' : 'bg-gold-soft text-gold-soft-text',
          )}
        >
          {badge}
        </span>
        <span className="font-display text-[32px] font-semibold leading-[1.1]">{headline}</span>
        <span className="text-[16px] leading-[1.45] text-soft-text">{sub}</span>
      </div>

      <div className="flex flex-col overflow-hidden rounded-[26px] bg-forest">
        <ResultStones
          syllables={view.stones}
          states={view.states}
          selected={props.selected}
          bee={pass ? 'pass' : 'retry'}
          label={label}
        />
        <div
          className="grid gap-1.5 px-2.5 pb-3"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {view.stones.map((stone, k) => {
            const on = props.selected === k;
            const state = view.states[k] ?? 'clean';
            const look = CHIP[on ? 'selected' : state];
            const text = stoneText(stone);
            return (
              <button
                key={k}
                type="button"
                onClick={() => props.onChip(k)}
                aria-label={r('chipAria', { syl: text })}
                aria-pressed={on}
                data-chip={state}
                className={gcn(
                  'chip flex h-[52px] min-w-0 flex-col items-center justify-center gap-px rounded-[16px] border-2 px-1',
                  look.bg,
                  look.fg,
                  look.border,
                  look.dashed && !on ? 'border-dashed' : 'border-solid',
                )}
              >
                <span lang="en" className="flex items-center gap-[5px] text-[15px] font-bold">
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M6 4 L20 12 L6 20 Z" />
                  </svg>
                  {text}
                </span>
                <span className="whitespace-nowrap text-[11px] font-semibold opacity-85">
                  {on
                    ? r('chipSelected')
                    : state === 'wobbly'
                      ? r('chipWobbly')
                      : state === 'close'
                        ? r('chipClose')
                        : r('chipClean')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="shrink-0 pl-1 text-[13px] font-bold text-muted-foreground">{r('wholeWord')}</span>
        <SoundButton
          tag="p4-native"
          voice="native"
          variant="pill"
          icon="play"
          label={r('native')}
          ariaLabel={r('playNative')}
          sub={secs(props.nativeS)}
          src={props.nativeClip.src}
          span={props.nativeClip.span}
          rate={props.nativeClip.rate}
          onPlay={() => props.onPlayed?.('native')}
        />
        <SoundButton
          tag="p4-you"
          voice="you"
          variant="pill"
          label={r('you')}
          ariaLabel={r('playMine')}
          sub={secs(props.mineS)}
          src={props.mineClip.src}
          onPlay={() => props.onPlayed?.('you')}
        />
      </div>

      <div className="mt-auto flex flex-col items-stretch gap-1">
        {main}
        {link}
      </div>
    </div>
  );
}
