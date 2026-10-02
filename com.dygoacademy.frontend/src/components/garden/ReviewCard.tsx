import * as React from 'react';
import { useTranslations } from 'next-intl';

import { AudioButton } from './AudioButton';
import { gcn } from './cn';

/**
 * Review card (canvas A2). Props only, no data fetching.
 *
 * White, 1px border, radius 26, 22px × 20px padding, a 6px "lift" under
 * it, children 14px apart. Order, which is also the VoiceOver order: tags
 * (level, topic, part of speech) → word (Fraunces 40) + IPA + the 52px
 * audio button → the answer: meaning (17px), the line in the learner's
 * meaning language (with its own `lang`, so VoiceOver switches voice),
 * the example in quotes, synonym and collocation chips.
 *
 * While `revealed` is false the answer isn't rendered at all (a screen
 * reader can't read ahead); the canvas shows a sprout with a drop and "Say
 * the meaning out loud, then check." instead. The answer rises in (8px +
 * fade, .25s). English content carries `lang="en"` because the UI
 * language may be Chinese or Vietnamese. Pass `className="flex-grow"` to
 * let the card fill the screen, as the canvas does.
 */
export interface ReviewCardProps {
  word: string;
  ipa?: string | null;
  audioSrc?: string | null;
  level?: string | null;
  topic?: string | null;
  partOfSpeech?: string | null;
  revealed: boolean;
  meaning: string;
  /** The meaning in the learner's meaning language, e.g. { text: 'giảm nhẹ', lang: 'vi' }. */
  meaningTranslation?: { text: string; lang: string } | null;
  /**
   * Puts the meaning-language line first (17px) and the English definition
   * second (15px, muted), as in A2-review-answer-vi. The garden sets it
   * whenever the learner has a meaning language (UI-L decision).
   */
  meaningFirst?: boolean;
  example?: string | null;
  collocations?: readonly string[] | null;
  /** Synonym chips under "Synonyms" (canvas A2), from `master_lexicon.synonyms`. */
  synonyms?: readonly string[] | null;
  className?: string;
}

/** The sprout-and-drop drawing on the hidden side of the card (72px). */
function ThinkSprout() {
  return (
    <svg width="72" height="72" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
      <ellipse cx="30" cy="52" rx="20" ry="5" fill="var(--color-border)" />
      <path
        d="M30 50 V32"
        stroke="var(--stage-tree-canopy)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M30 38 C22 37 17 31 19 26 C26 26 30 31 30 38 Z" fill="var(--stage-sprout-leaf)" />
      <path d="M30 35 C38 34 43 28 41 23 C34 23 30 28 30 35 Z" fill="var(--stage-sprout)" />
      <path
        d="M44 10 C44 10 39 17 39 20 A5 5 0 0 0 49 20 C49 17 44 10 44 10 Z"
        fill="var(--stage-due)"
      />
    </svg>
  );
}

export function ReviewCard({
  word,
  ipa,
  audioSrc,
  level,
  topic,
  partOfSpeech,
  revealed,
  meaning,
  meaningTranslation,
  meaningFirst = false,
  example,
  collocations,
  synonyms,
  className,
}: ReviewCardProps) {
  const t = useTranslations('components.review');
  const pos = useTranslations('components.partOfSpeech');
  const tags = [
    level ? { text: level, strong: true } : null,
    topic ? { text: topic, strong: false } : null,
    partOfSpeech ? { text: partOfSpeechLabel(partOfSpeech, pos), strong: false } : null,
  ].filter((tag): tag is { text: string; strong: boolean } => tag !== null);

  return (
    <article
      aria-label={t('cardLabel', { word })}
      className={gcn(
        'flex flex-col gap-[14px] rounded-hero border border-border bg-surface px-5 py-[22px] shadow-card-lift',
        className,
      )}
    >
      {tags.length > 0 ? (
        <ul aria-label={t('tags')} className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <li
              key={`${tag.text}-${index}`}
              className={gcn(
                'rounded-[10px] px-2.5 py-1 text-[12px]',
                tag.strong
                  ? 'bg-rating-good font-bold text-forest'
                  : 'bg-bg font-semibold text-muted-foreground',
              )}
            >
              {tag.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-col">
          <span
            lang="en"
            className="break-words font-display text-[40px] font-semibold leading-[1.05]"
          >
            {word}
          </span>
          {ipa ? <span className="text-[16px] text-muted-foreground">{ipa}</span> : null}
        </div>
        <AudioButton src={audioSrc} label={t('play', { word })} />
      </div>

      {revealed ? (
        <div className="rise flex flex-col gap-[14px]">
          <div className="flex flex-col gap-0.5">
            <h3 className="sr-only">{t('meaning')}</h3>
            {meaningFirst && meaningTranslation?.text ? (
              <>
                <span
                  lang={meaningTranslation.lang}
                  className="text-[17px] font-semibold leading-[1.35]"
                >
                  {meaningTranslation.text}
                </span>
                <span lang="en" className="text-[15px] text-muted-foreground">
                  {meaning}
                </span>
              </>
            ) : (
              <>
                <span lang="en" className="text-[17px] font-semibold leading-[1.35]">
                  {meaning}
                </span>
                {meaningTranslation?.text ? (
                  <span lang={meaningTranslation.lang} className="text-[15px] text-muted-foreground">
                    {meaningTranslation.text}
                  </span>
                ) : null}
              </>
            )}
          </div>

          {example ? (
            <>
              <h3 className="sr-only">{t('example')}</h3>
              <p
                lang="en"
                className="rounded-[14px] bg-surface-sunken px-[14px] py-3 font-display text-[16px] leading-[1.45] text-example"
              >
                {t('quoted', { text: example })}
              </p>
            </>
          ) : null}

          <ChipList title={t('synonyms')} items={synonyms} />
          <ChipList title={t('collocations')} items={collocations} />
        </div>
      ) : (
        <div className="flex flex-grow flex-col items-center justify-center gap-2.5 text-center text-muted-foreground">
          <ThinkSprout />
          <span className="text-[15px]">{t.rich('hiddenHint', { br: () => <br /> })}</span>
        </div>
      )}
    </article>
  );
}

/** A small uppercase heading over English word chips (synonyms, collocations). */
function ChipList({ title, items }: { title: string; items?: readonly string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="overline-label text-[12px] font-bold text-muted-foreground">{title}</h3>
      <ul lang="en" className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-control border border-sprout-border px-3 py-1.5 text-[14px] font-semibold text-forest"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Parts of speech the garden translates; anything else shows as stored. */
const PARTS_OF_SPEECH = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adjective',
  adverb: 'adverb',
  pronoun: 'pronoun',
  preposition: 'preposition',
  conjunction: 'conjunction',
  interjection: 'interjection',
  determiner: 'determiner',
  phrase: 'phrase',
  'phrasal verb': 'phrasalVerb',
  idiom: 'idiom',
} as const;

function partOfSpeechLabel(
  value: string,
  t: (key: (typeof PARTS_OF_SPEECH)[keyof typeof PARTS_OF_SPEECH]) => string,
): string {
  const key = PARTS_OF_SPEECH[value.trim().toLowerCase() as keyof typeof PARTS_OF_SPEECH];
  return key ? t(key) : value;
}
