import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { PlantGlyph } from './PlantGlyph';
import type { PlantStage } from './plantStage';

/**
 * Word row (canvas A7): at least 60px tall, radius 16, 8px padding (12px
 * on the right), a 40px well (radius 12) with the plant standing at its
 * bottom, the word (15px bold), its meaning on one line with an ellipsis
 * (13px), and the due text (12px bold) on the right.
 *
 * - `variant="wilting"`: the gold wash background and border.
 * - `dueTone` colours the due text: `now` blue ("Due now"), `new` gold
 *   ("New"), `later` muted ("in 3 days"). `variant="due"` is the old name
 *   for a normal row with `dueTone="now"`.
 *
 * The glyph is labelled with its stage so the stage isn't colour-only.
 * Pass `href` to make the whole row one link, or `onClick` for a button;
 * with neither it's static.
 */
export type WordRowVariant = 'normal' | 'due' | 'wilting';
export type WordDueTone = 'now' | 'new' | 'later';

type WordRowBase = {
  word: string;
  meaning: string;
  /** `lang` of the meaning when it's in the learner's meaning language. */
  meaningLang?: string;
  /** e.g. "Due now", "New", "in 3 days". */
  dueText: string;
  dueTone?: WordDueTone;
  stage: PlantStage;
  variant?: WordRowVariant;
  className?: string;
};

export type WordRowProps =
  | (WordRowBase & { href: string; onClick?: undefined })
  | (WordRowBase & { href?: undefined; onClick?: () => void });

const DUE_TONE: Record<WordDueTone, string> = {
  now: 'text-garden-water-due',
  new: 'text-garden-gold-text',
  later: 'text-garden-muted',
};

export function WordRow(props: WordRowProps) {
  const { word, meaning, meaningLang, dueText, stage, variant = 'normal', className } = props;
  const dueTone: WordDueTone = props.dueTone ?? (variant === 'due' ? 'now' : 'later');
  const plant = useTranslations('components.plant');

  const classes = gcn(
    'flex min-h-[60px] w-full items-center gap-2.5 rounded-control border py-2 pl-2 pr-3 text-left text-garden-text',
    variant === 'wilting'
      ? 'border-garden-gold-border bg-garden-gold-soft'
      : 'border-garden-border bg-garden-surface',
    (props.href !== undefined || props.onClick) &&
      'transition-colors duration-quick ease-garden hover:border-garden-muted',
    className,
  );

  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-tile bg-garden-bg">
        <PlantGlyph stage={stage} aria-label={plant(stage)} />
      </span>
      <span className="flex min-w-0 flex-grow flex-col">
        <span lang="en" className="text-[15px] font-bold">
          {word}
        </span>
        <span
          lang={meaningLang}
          className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-garden-muted"
        >
          {meaning}
        </span>
      </span>
      <span className={gcn('shrink-0 text-right text-[12px] font-bold', DUE_TONE[dueTone])}>
        {dueText}
      </span>
    </>
  );

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes} data-variant={variant}>
        {content}
      </Link>
    );
  }
  if (props.onClick) {
    return (
      <button type="button" onClick={props.onClick} className={classes} data-variant={variant}>
        {content}
      </button>
    );
  }
  return (
    <div className={classes} data-variant={variant}>
      {content}
    </div>
  );
}
