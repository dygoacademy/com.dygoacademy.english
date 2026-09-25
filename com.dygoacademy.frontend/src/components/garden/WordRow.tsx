import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { PlantGlyph } from './PlantGlyph';
import type { PlantStage } from './plantStage';

/**
 * Word row (design system §11): min-h 60, a 40px glyph well, the word,
 * its meaning on one line (ellipsis) and the due text.
 *
 * Variants: normal; due now (blue due text, the glyph drips); wilting
 * (gold-soft background). The glyph is labelled with its stage so the
 * stage isn't colour-only. Pass `href` to make the whole row one link
 * (§15), or `onClick` for a button; with neither it's static.
 */
export type WordRowVariant = 'normal' | 'due' | 'wilting';

type WordRowBase = {
  word: string;
  meaning: string;
  /** `lang` of the meaning when it's in the learner's meaning language. */
  meaningLang?: string;
  /** e.g. "in 3 days", "Due now", "Needs help". */
  dueText: string;
  stage: PlantStage;
  variant?: WordRowVariant;
  className?: string;
};

export type WordRowProps =
  | (WordRowBase & { href: string; onClick?: undefined })
  | (WordRowBase & { href?: undefined; onClick?: () => void });

export function WordRow(props: WordRowProps) {
  const { word, meaning, meaningLang, dueText, stage, variant = 'normal', className } = props;
  const plant = useTranslations('components.plant');

  const classes = gcn(
    'flex min-h-[60px] w-full items-center gap-3 rounded-control border px-3 py-2 text-left text-garden-text',
    variant === 'wilting'
      ? 'border-garden-gold-soft bg-garden-gold-soft'
      : 'border-garden-border bg-garden-surface',
    (props.href !== undefined || props.onClick) &&
      'transition-colors duration-quick ease-garden hover:border-garden-muted active:bg-garden-surface-sunken',
    className,
  );

  const content = (
    <>
      <span
        className={gcn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-tile',
          variant === 'due'
            ? 'bg-garden-water-soft'
            : variant === 'wilting'
              ? 'bg-garden-surface'
              : 'bg-garden-surface-sunken',
        )}
      >
        <PlantGlyph
          stage={stage}
          size={32}
          animate={variant === 'due' ? 'drip' : undefined}
          aria-label={plant(stage)}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span lang="en" className="block truncate text-body-l font-semibold">
          {word}
        </span>
        <span lang={meaningLang} className="block truncate text-body-s text-garden-muted">
          {meaning}
        </span>
      </span>
      <span
        className={gcn(
          'max-w-[35%] shrink-0 text-right text-label',
          variant === 'due'
            ? 'font-semibold text-garden-water-text'
            : variant === 'wilting'
              ? 'font-semibold text-garden-gold-soft-text'
              : 'font-normal text-garden-muted',
        )}
      >
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
