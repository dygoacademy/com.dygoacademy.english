'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from '@/components/garden/cn';

import { FlipHintIcon, HomeFlower, HomeSprout, HomeTree, WiltedSprout } from './homeArt';

/** The four pains, in the canvas order. */
export const PAIN_KEYS = ['use', 'forget', 'language', 'habit'] as const;
export type PainKey = (typeof PAIN_KEYS)[number];

/** The plant on each card back (reference H3s-pain-flipped and the LandingV2 sources). */
const BACK_ART: Record<PainKey, React.ReactNode> = {
  use: <HomeFlower width={30} height={39} className="block" />,
  forget: <HomeTree width={34} height={43} className="block" />,
  language: <HomeSprout width={36} height={36} className="block" />,
  habit: <HomeFlower width={30} height={39} className="block" />,
};

export interface PainCardsProps {
  /** Start with these cards flipped (the H3s-pain-flipped fixture flips `forget`). */
  initialFlipped?: PainKey[];
}

/**
 * Home page v2 HP-7 · "Sound familiar?" (reference `H3-home-v2-phone`,
 * `H4-home-v2-desktop`, `H3s-pain-flipped`, each also `-vi`). Four cards,
 * 2 × 2 on the phone and 4 in a row on desktop. Each card is one
 * `<button aria-pressed>`: the front is the pain in the learner's voice,
 * the back is how Dygo helps. Both faces stay in the DOM and the hidden one
 * is `aria-hidden`. Flip = a 450 ms 3D turn; reduced motion = a 150 ms
 * crossfade. Flipping one card leaves the others alone.
 */
export function PainCards({ initialFlipped = [] }: PainCardsProps) {
  const [flipped, setFlipped] = React.useState<ReadonlySet<PainKey>>(() => new Set(initialFlipped));

  const toggle = React.useCallback((key: PainKey) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2.5 home-lg:grid-cols-4 home-lg:gap-5">
      {PAIN_KEYS.map((key) => (
        <PainCard key={key} painKey={key} flipped={flipped.has(key)} onToggle={toggle} />
      ))}
    </div>
  );
}

const FACE =
  'flex flex-col rounded-[22px] p-3.5 [backface-visibility:hidden] home-lg:p-[18px] motion-reduce:transition-opacity motion-reduce:duration-150';

function PainCard({
  painKey,
  flipped,
  onToggle,
}: {
  painKey: PainKey;
  flipped: boolean;
  onToggle: (key: PainKey) => void;
}) {
  const t = useTranslations('screens.home.public.pains');

  // Enter and Space are handled here (and the native click they would cause is
  // prevented), so a keyboard flip is one toggle in every browser and in tests.
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) onToggle(painKey);
  }
  function onKeyUp(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === ' ') event.preventDefault();
  }

  return (
    <button
      type="button"
      aria-pressed={flipped}
      data-pain={painKey}
      onClick={() => onToggle(painKey)}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      className="box-border flex min-h-[188px] cursor-pointer border-none bg-transparent p-0 text-left font-body text-text [perspective:1000px] home-lg:min-h-[200px]"
    >
      <span
        className={gcn(
          'relative flex flex-1 transition-transform duration-[450ms] ease-in-out [transform-style:preserve-3d] motion-reduce:transition-none motion-reduce:[transform:none]',
          flipped && '[transform:rotateY(180deg)]',
        )}
      >
        <span
          aria-hidden={flipped || undefined}
          data-face="front"
          className={gcn(
            FACE,
            'gap-2.5 border border-solid border-border bg-surface shadow-[0_4px_0_var(--color-card-lift)]',
            // HP-11: only the face shown sets the card's height (as on the boards); the other is laid over it.
            flipped ? 'absolute inset-0 overflow-hidden motion-reduce:opacity-0' : 'flex-1',
          )}
        >
          <span className="grow font-display text-[16px] font-medium leading-[1.35] text-text home-lg:text-[20px]">
            {t(`cards.${painKey}.front`)}
          </span>
          <span className="flex items-end justify-between gap-1.5">
            <span className="flex items-center gap-[5px] text-[12px] font-semibold leading-[1.3] text-muted-foreground">
              <FlipHintIcon width={14} height={14} className="block shrink-0" />
              <span className="hidden home-lg:inline">{t('hint')}</span>
            </span>
            <WiltedSprout width={30} height={30} className="block shrink-0" />
          </span>
        </span>
        <span
          aria-hidden={!flipped || undefined}
          data-face="back"
          className={gcn(
            FACE,
            'gap-2 bg-forest text-white shadow-[0_4px_0_var(--color-forest-shadow)] [transform:rotateY(180deg)] motion-reduce:[transform:none]',
            !flipped ? 'absolute inset-0 overflow-hidden motion-reduce:opacity-0' : 'flex-1',
          )}
        >
          <span className="text-[11px] font-bold uppercase tracking-[.08em] text-gold-light">{t('helps')}</span>
          <span className="grow text-[14px] leading-[1.45] home-lg:text-[16px]">{t(`cards.${painKey}.back`)}</span>
          <span className="flex justify-end">{BACK_ART[painKey]}</span>
        </span>
      </span>
    </button>
  );
}
