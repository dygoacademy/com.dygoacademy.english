'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { splitMatch } from '@/lib/search/fold';

import { gcn } from '../cn';
import { Highlighted } from '../Highlighted';
import { PlantGlyph } from '../PlantGlyph';
import { PlusIcon, SearchIcon, SeedIcon } from '../icons';
import { IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';
import type { TopicBedWord } from './TopicBedScreen';

/**
 * A7c · Search words in a topic (canvas `source/TopicWordSearch.dc.html`,
 * `reference/A7c-word-search`; 2026-10-11). From the search button in the
 * A7 header. Field (autofocus) + Cancel back to the bed, a hint, "In
 * {topic} · n" with the matching words (English word or meaning, matched
 * part highlighted), "Not in {topic} yet" with one word to plant here, and
 * the recent searches for this topic at the bottom. No tab bar.
 *
 * Matching is the caller's (`matches`): this screen highlights `query` in
 * the word, or in the meaning when the word doesn't contain it.
 */
export interface TopicWordSearchScreenProps {
  topic: string;
  query: string;
  onQueryChange: (query: string) => void;
  /** Enter in the field (saves it as a recent search). */
  onSubmit?: () => void;
  cancelHref: string;
  /** Words of this topic that match, in the bed's order. */
  matches: readonly TopicBedWord[];
  /** Where a result goes (A7 does the same for its rows). */
  hrefFor: (word: TopicBedWord) => string;
  onOpen?: (word: TopicBedWord) => void;
  /**
   * "Not in {topic} yet": a word to plant here; `line` is the dictionary
   * line (part of speech · level · meaning) when known. Null hides it.
   */
  suggestion: { word: string; line: string | null } | null;
  onPlant: (word: string) => void;
  /** The learner can't edit this bed: the button saves to My words. */
  saveToMyWords?: boolean;
  recent: readonly string[];
  onRecent: (query: string) => void;
}

const SECTION = 'overline-label text-[12px] font-bold tracking-[.08em] text-muted-foreground';
const CARD = 'flex flex-col rounded-[20px] border border-border bg-surface px-[14px] py-0.5';

export function TopicWordSearchScreen({
  topic,
  query,
  onQueryChange,
  onSubmit,
  cancelHref,
  matches,
  hrefFor,
  onOpen,
  suggestion,
  onPlant,
  saveToMyWords = false,
  recent,
  onRecent,
}: TopicWordSearchScreenProps) {
  const t = useTranslations('screens.bed');
  const s = useTranslations('screens.bed.search');
  const searching = query.trim().length > 0;
  const dueText = (due: TopicBedWord['due']) =>
    due.tone === 'now'
      ? t('dueNow')
      : due.tone === 'new'
        ? t('new')
        : due.days === null
          ? ''
          : t('inDays', { count: due.days });

  return (
    <div className={gcn(SCREEN_CLASSES, IPAD_NAV_COLUMN, 'gap-[14px] px-4 pb-6 pt-5 ipad:pl-4 ipad-lg:pl-4')}>
      <form
        role="search"
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.();
        }}
      >
        <label className="box-border flex h-12 flex-grow items-center gap-2 rounded-[24px] border-2 border-forest bg-surface px-[14px]">
          <SearchIcon width={20} height={20} className="shrink-0 text-muted-foreground" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-label={s('placeholder', { topic })}
            placeholder={s('placeholder', { topic })}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-grow border-none bg-transparent px-0.5 py-px text-[16px] text-text outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <Link href={cancelHref} className="px-1 py-2.5 text-[15px] font-semibold text-forest">
          {s('cancel')}
        </Link>
      </form>
      <span className="-mt-1.5 px-1 text-[13px] text-muted-foreground">{s('hint')}</span>

      {searching && matches.length > 0 ? (
        <section aria-labelledby="word-search-in" className="flex flex-col gap-[14px]">
          <div className="flex items-baseline justify-between">
            <h2 id="word-search-in" className={SECTION}>
              {s('inTopic', { topic, count: matches.length })}
            </h2>
            <span className="text-[12px] text-muted-foreground">{s('tapHint')}</span>
          </div>
          <ul className={CARD}>
            {matches.map((word, index) => (
              <li key={word.id} className={gcn(index > 0 && 'border-t border-divider')}>
                <Link
                  href={hrefFor(word)}
                  onClick={() => onOpen?.(word)}
                  className="box-content flex min-h-[60px] items-center gap-2.5 py-1.5 text-text"
                >
                  <span className="flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-tile bg-bg">
                    <PlantGlyph stage={word.wilting ? 'wilting' : word.stage} />
                  </span>
                  <span className="flex min-w-0 flex-grow flex-col">
                    <span className="text-[16px] font-semibold text-muted-foreground">
                      <Highlighted text={word.word} query={query} lang="en" />
                    </span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-muted-foreground">
                      <Highlighted
                        text={word.meaning}
                        query={splitMatch(word.word, query) ? '' : query}
                        lang={word.meaningLang}
                      />
                    </span>
                  </span>
                  <span
                    className={gcn(
                      'shrink-0 text-[12px] font-bold',
                      word.due.tone === 'now'
                        ? 'text-water-due'
                        : word.due.tone === 'new'
                          ? 'text-gold-text'
                          : 'text-muted-foreground',
                    )}
                  >
                    {dueText(word.due)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {searching && suggestion ? (
        <section aria-labelledby="word-search-not-in" className="flex flex-col gap-[14px]">
          <h2 id="word-search-not-in" className={SECTION}>
            {s('notInTopic', { topic })}
          </h2>
          <div className={CARD}>
            <div className="flex min-h-[60px] items-center gap-2.5">
              <span
                aria-hidden="true"
                className="box-border flex h-10 w-10 shrink-0 items-center justify-center rounded-tile border-[1.5px] border-dashed border-locked-border text-gold-text"
              >
                <SeedIcon width={20} height={20} />
              </span>
              <span className="flex min-w-0 flex-grow flex-col">
                <span className="text-[16px] font-semibold text-muted-foreground">
                  <Highlighted text={suggestion.word} query={query} lang="en" />
                </span>
                {suggestion.line ? (
                  <span className="text-[12px] text-muted-foreground">
                    <Highlighted
                      text={suggestion.line}
                      query={splitMatch(suggestion.word, query) ? '' : query}
                    />
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => onPlant(suggestion.word)}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-[20px] bg-forest px-[14px] text-[14px] font-bold text-surface"
              >
                <PlusIcon width={16} height={16} strokeWidth="2.6" />
                {saveToMyWords ? s('saveToMyWords') : s('plantHere')}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {searching && matches.length === 0 && !suggestion ? (
        <p className="px-1 text-[15px] text-muted-foreground">{s('none', { topic })}</p>
      ) : null}

      {recent.length > 0 ? (
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-muted-foreground">{s('recent')}</span>
          {recent.map((q) => (
            <button
              key={q}
              type="button"
              lang="en"
              onClick={() => onRecent(q)}
              className="rounded-[14px] border border-border bg-surface px-2.5 py-[5px] text-[13px] font-semibold text-text"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
