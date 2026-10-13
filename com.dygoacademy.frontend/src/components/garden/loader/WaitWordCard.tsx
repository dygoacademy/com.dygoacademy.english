'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { WAIT_WORDS, type WaitWord } from './words';

/**
 * LD3 "While you wait" card: one growth word with its IPA, part of speech,
 * meaning and an example. The word is picked after mount, so the server
 * render and the first client render match; `word` pins it (reference
 * pages, tests). The meaning follows the app language.
 */
export function WaitWordCard({ word }: { word?: string }) {
  const t = useTranslations('screens.loader');
  const meanings = useTranslations('screens.loader.words');
  const pos = useTranslations('components.partOfSpeech');
  const [picked, setPicked] = React.useState<WaitWord | null>(
    () => WAIT_WORDS.find((w) => w.key === word) ?? null,
  );
  React.useEffect(() => {
    if (picked) return;
    setPicked(WAIT_WORDS[Math.floor(Math.random() * WAIT_WORDS.length)] ?? null);
  }, [picked]);

  if (!picked) return null;
  return (
    <div
      aria-hidden="true"
      className="dg-ld-card absolute inset-x-6 bottom-[calc(56px+var(--safe-bottom,0px))] flex flex-col gap-[6px] rounded-[20px] border border-border bg-white px-5 py-[18px]"
    >
      <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {t('wait')}
      </div>
      <div className="flex items-baseline gap-[10px]">
        <span lang="en" className="font-display text-[26px] font-semibold text-forest">
          {picked.word}
        </span>
        <span className="text-[15px] text-muted-foreground">
          <span lang="en">{picked.ipa}</span> · {pos(picked.pos)}
        </span>
      </div>
      <div className="text-[15px] leading-[1.45] text-text">
        {`${meanings(picked.key)}. `}
        <span lang="en">{`“${picked.example}”`}</span>
      </div>
    </div>
  );
}
