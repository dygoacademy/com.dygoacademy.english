import * as React from 'react';
import { useTranslations } from 'next-intl';

import { AudioButton } from './AudioButton';
import { gcn } from './cn';

/**
 * Review card (design system §11, §15). Props only, no data fetching.
 *
 * Order, which is also the VoiceOver order: tags (level, topic, part of
 * speech) → word (`display-xl`) + IPA + audio → the answer: meaning, an
 * optional line in the learner's meaning language (with its own `lang`,
 * so VoiceOver switches voice, §4.3), example, collocations.
 *
 * While `revealed` is false the answer isn't rendered at all, so a screen
 * reader can't read ahead. It rises in (8px + fade, motion-quick) when
 * shown. English content carries `lang="en"` because the UI language may
 * be Chinese or Vietnamese. The iPad two-pane landscape layout is UI-7.
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
  /** The meaning in the learner's meaning language, e.g. { text: 'môi trường', lang: 'vi' }. */
  meaningTranslation?: { text: string; lang: string } | null;
  example?: string | null;
  collocations?: readonly string[] | null;
  className?: string;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Bolds the word (and simple inflections of it) inside the example. */
function highlight(sentence: string, word: string): React.ReactNode {
  const stem = word.trim();
  if (!stem) return sentence;
  const pattern = new RegExp(`(\\b${escapeRegExp(stem)}\\w*)`, 'gi');
  const parts = sentence.split(pattern);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-garden-text">
        {part}
      </strong>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
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
  example,
  collocations,
  className,
}: ReviewCardProps) {
  const t = useTranslations('components.review');
  const tags = [level, topic, partOfSpeech].filter((tag): tag is string => Boolean(tag));

  return (
    <article
      aria-label={t('cardLabel', { word })}
      className={gcn(
        'rounded-hero border border-garden-border bg-garden-surface px-5 py-[22px] text-garden-text shadow-card-lift',
        className,
      )}
    >
      {tags.length > 0 ? (
        <ul aria-label={t('tags')} className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <li
              key={`${tag}-${index}`}
              className={gcn(
                'inline-flex min-h-7 items-center rounded-full border border-garden-border bg-garden-surface-sunken px-3 text-label',
                tag === partOfSpeech && 'italic text-garden-muted',
              )}
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p lang="en" className="break-words font-display text-display-xl">
            {word}
          </p>
          {ipa ? <p className="mt-1 text-body-m text-garden-muted">{ipa}</p> : null}
        </div>
        <AudioButton src={audioSrc} label={t('play', { word })} className="mt-1" />
      </div>

      {revealed ? (
        <div className="garden-rise mt-5 border-t border-garden-border pt-5">
          <h3 className="overline-label text-label text-garden-muted">{t('meaning')}</h3>
          <p lang="en" className="mt-1 text-body-l font-semibold">
            {meaning}
          </p>
          {meaningTranslation?.text ? (
            <p lang={meaningTranslation.lang} className="mt-1 text-body-m text-garden-muted">
              {meaningTranslation.text}
            </p>
          ) : null}

          {example ? (
            <>
              <h3 className="overline-label mt-4 text-label text-garden-muted">{t('example')}</h3>
              <p
                lang="en"
                className="mt-1 rounded-tile bg-garden-surface-sunken px-3 py-2.5 text-body-m text-garden-text"
              >
                {highlight(example, word)}
              </p>
            </>
          ) : null}

          {collocations && collocations.length > 0 ? (
            <>
              <h3 className="overline-label mt-4 text-label text-garden-muted">
                {t('collocations')}
              </h3>
              <ul lang="en" className="mt-1.5 flex flex-wrap gap-1.5">
                {collocations.map((collocation) => (
                  <li
                    key={collocation}
                    className="inline-flex min-h-8 items-center rounded-full bg-stage-sprout px-3 text-body-s font-semibold text-garden-forest"
                  >
                    {collocation}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 rounded-tile border border-dashed border-garden-border px-3 py-4 text-center text-body-s text-garden-muted">
          {t('hiddenHint')}
        </p>
      )}
    </article>
  );
}
