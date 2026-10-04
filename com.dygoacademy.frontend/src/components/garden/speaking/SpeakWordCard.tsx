'use client';

import { useTranslations } from 'next-intl';

import { partOfSpeechLabel } from '../ReviewCard';

import { IpaText } from './IpaText';

/**
 * SP1 compact word card: word, IPA with the stressed syllable in gold,
 * level and part-of-speech tags, meaning. With a translation (vi / zh
 * meaning language) it comes first and the English definition under it.
 */
export function SpeakWordCard({
  word,
  ipa,
  cefr,
  partOfSpeech,
  translation,
  translationLang,
  definition,
}: {
  word: string;
  ipa: string | null;
  cefr: string | null;
  partOfSpeech: string | null;
  translation: string | null;
  translationLang?: string;
  definition: string | null;
}) {
  const pos = useTranslations('components.partOfSpeech');
  return (
    <div className="flex flex-col gap-0.5 rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex items-baseline gap-2.5">
        <span lang="en" className="font-display text-[28px] font-semibold leading-[1.1]">
          {word}
        </span>
        {ipa ? (
          <span className="text-[15px] text-muted-foreground">
            <IpaText ipa={ipa} />
          </span>
        ) : null}
        <span className="ml-auto flex gap-1">
          {cefr ? (
            <span className="rounded-lg bg-on-forest-muted px-2 py-[3px] text-[11px] font-bold text-forest">
              {cefr}
            </span>
          ) : null}
          {partOfSpeech ? (
            <span className="rounded-lg bg-bg px-2 py-[3px] text-[11px] font-semibold text-muted-foreground">
              {partOfSpeechLabel(partOfSpeech, pos)}
            </span>
          ) : null}
        </span>
      </div>
      {translation ? (
        <>
          <span lang={translationLang} className="text-[14px] text-example">
            {translation}
          </span>
          {definition ? (
            <span lang="en" className="text-[13px] text-muted-foreground">
              {definition}
            </span>
          ) : null}
        </>
      ) : definition ? (
        <span lang="en" className="text-[14px] text-example">
          {definition}
        </span>
      ) : null}
    </div>
  );
}
