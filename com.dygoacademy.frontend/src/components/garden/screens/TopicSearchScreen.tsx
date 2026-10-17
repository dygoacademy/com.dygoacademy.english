'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from '../cn';
import { Highlighted } from '../Highlighted';
import { ChevronRightIcon, PlusIcon, SearchIcon, SeedIcon } from '../icons';
import { TopicRow } from '../TopicRow';
import { IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';
import { leadingStage, type TopicsScreenTopic } from './TopicsScreen';

/**
 * A6b · Search topics (canvas `source/AdultSearch.dc.html`,
 * `reference/A6b-search-topics`; redesigned 2026-10-11). From the search
 * button on A6. Field + Cancel back to A6, then for a query: "Your topics"
 * (A6 topic cards → A7), "More topics to plant" (library topics the
 * learner hasn't started, with Plant), and "Looking for a word? x is in
 * Topic" → A7c. No match: "No topics called …" + Browse all topics.
 * Recent searches at the bottom. Matched letters in titles are highlighted.
 */
export interface SearchTopic extends TopicsScreenTopic {
  /** Library collection name ("IELTS Academic"); null for the learner's own beds. */
  collection: string | null;
  /** False for a library topic the learner hasn't started ("to plant"). */
  planted: boolean;
}

export interface TopicSearchScreenProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit?: () => void;
  cancelHref: string;
  yours: readonly SearchTopic[];
  more: readonly SearchTopic[];
  /** Where Plant goes for a library topic. */
  plantHref: (topic: SearchTopic) => string;
  /** Opening a result or planting (saves the search). */
  onOpen?: () => void;
  /** `highlight` false when only the word's meaning matched (the English word is still named). */
  wordHint: { word: string; topic: string; href: string; highlight?: boolean } | null;
  recent: readonly string[];
  onRecent: (query: string) => void;
}

const SECTION = 'overline-label text-[12px] font-bold tracking-[.08em] text-muted-foreground';
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export function TopicSearchScreen({
  query,
  onQueryChange,
  onSubmit,
  cancelHref,
  yours,
  more,
  plantHref,
  onOpen,
  wordHint,
  recent,
  onRecent,
}: TopicSearchScreenProps) {
  const t = useTranslations('screens.topics');
  const f = useTranslations('screens.topics.find');
  const searching = query.trim().length > 0;
  const meta = (topic: SearchTopic) =>
    [topic.collection, topic.level, t('words', { count: topic.words })]
      .filter(Boolean)
      .join(t('separator'));

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
            aria-label={f('placeholder')}
            placeholder={f('placeholder')}
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-grow border-none bg-transparent px-0.5 py-px text-[16px] text-text outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <Link href={cancelHref} className="px-1 py-2.5 text-[15px] font-semibold text-forest">
          {f('cancel')}
        </Link>
      </form>

      {searching && yours.length > 0 ? (
        <section aria-labelledby="topic-search-yours" className="flex flex-col gap-[14px]">
          <h2 id="topic-search-yours" className={SECTION}>
            {f('yours', { count: yours.length })}
          </h2>
          <ul className="flex flex-col gap-2">
            {yours.map((topic) => (
              <li key={topic.id} onClickCapture={onOpen}>
                <TopicRow
                  href={topic.href}
                  titleText={topic.title}
                  title={
                    <span className="text-muted-foreground">
                      <Highlighted text={topic.title} query={query} />
                    </span>
                  }
                  meta={meta(topic)}
                  stage={leadingStage(topic.stages, topic.words)}
                  due={
                    topic.due === null
                      ? null
                      : topic.due > 0
                        ? { text: t('due', { count: topic.due }), tone: 'due' }
                        : { text: t('allWatered'), tone: 'watered' }
                  }
                  shares={
                    topic.stages
                      ? {
                          tree: pct(topic.stages.tree, topic.words),
                          flower: pct(topic.stages.flower, topic.words),
                          sprout: pct(topic.stages.sprout, topic.words),
                        }
                      : null
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {searching && more.length > 0 ? (
        <section aria-labelledby="topic-search-more" className="flex flex-col gap-[14px]">
          <div className="flex items-baseline justify-between">
            <h2 id="topic-search-more" className={SECTION}>
              {f('more', { count: more.length })}
            </h2>
            <span className="text-[12px] text-muted-foreground">{f('fromLibrary')}</span>
          </div>
          <ul className="flex flex-col rounded-[20px] border border-border bg-surface px-[14px] py-0.5">
            {more.map((topic, index) => (
              <li
                key={topic.id}
                className={gcn(
                  'box-content flex min-h-16 items-center gap-3',
                  index > 0 && 'border-t border-divider',
                )}
              >
                <span
                  aria-hidden="true"
                  className="box-content flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-locked-border text-gold-text"
                >
                  <SeedIcon width={26} height={26} />
                </span>
                <span className="flex min-w-0 flex-grow flex-col">
                  <span
                    title={topic.title}
                    className="line-clamp-2 min-w-0 break-words text-[15px] font-bold text-muted-foreground"
                  >
                    <Highlighted text={topic.title} query={query} />
                  </span>
                  <span className="truncate text-[12px] text-muted-foreground">{meta(topic)}</span>
                </span>
                <Link
                  href={plantHref(topic)}
                  onClick={onOpen}
                  aria-label={f('plantTopic', { topic: topic.title })}
                  className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[19px] bg-forest px-[14px] text-[14px] font-bold text-surface"
                >
                  <PlusIcon width={16} height={16} strokeWidth="2.6" />
                  {f('plant')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {searching && yours.length === 0 && more.length === 0 ? (
        <div className="flex flex-col items-start gap-2 px-1">
          <p className="text-[15px] text-muted-foreground">{f('empty', { query: query.trim() })}</p>
          <Link href={cancelHref} className="text-[15px] font-semibold text-forest">
            {f('browseAll')}
          </Link>
        </div>
      ) : null}

      {searching && wordHint ? (
        <Link
          href={wordHint.href}
          onClick={onOpen}
          className="flex items-center gap-2.5 rounded-[16px] bg-locked-bg px-[14px] py-2.5 text-text"
        >
          <SearchIcon width={20} height={20} className="shrink-0 text-muted-foreground" />
          <span className="flex-grow text-[13px] text-soft-text">
            {f.rich('wordHint', {
              word: wordHint.word,
              topic: wordHint.topic,
              w: () => (
                <b className="text-text">
                  {wordHint.highlight === false ? (
                    <span lang="en">{wordHint.word}</span>
                  ) : (
                    <Highlighted text={wordHint.word} query={query} lang="en" />
                  )}
                </b>
              ),
              b: (chunks) => <b className="text-text">{chunks}</b>,
            })}
          </span>
          <ChevronRightIcon
            width={16}
            height={16}
            strokeWidth="2.4"
            className="shrink-0 text-muted-foreground"
          />
        </Link>
      ) : null}

      {recent.length > 0 ? (
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-muted-foreground">{f('recent')}</span>
          {recent.map((q) => (
            <button
              key={q}
              type="button"
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
