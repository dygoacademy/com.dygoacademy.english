'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { buttonClassName } from '../buttonStyles';
import { gcn } from '../cn';
import { EmptyState } from '../EmptyState';
import { BeeFlower, BeeGlyph } from '../Bee';
import { useGardenFormat } from '../format';
import {
  BackIcon,
  CheckIcon,
  MicIcon,
  MoreIcon,
  PlusIcon,
  SearchIcon,
  SeedIcon,
  WaterIcon,
} from '../icons';
import { IconButton } from '../IconButton';
import { StageTile } from '../StageTile';
import { WordRow } from '../WordRow';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A7 · Topic bed (canvas `reference/A7-topic-bed`, and
 * `A7-topic-bed-filter-sprouts` with the Sprouts tile on). No tab bar.
 *
 * UI-7 U7-2 (design system §10, A7): with the iPad nav on, the rail /
 * sidebar show (no bottom tab bar), the word list goes 2 columns, and at
 * `lg` the sidebar lists the beds (`sidebar`) as the master of the
 * master–detail view, this bed being the detail.
 *
 * Header (Back, title + meta, options) → four stage tiles that filter the
 * list (tap again to clear) → Water (or Plant) / Quiz / Add word → "Plant N
 * new" when there's both something due and seeds → the "Speak" row
 * (SE2, restyled with the 2026-10-11 A7 board) → "Bees are waiting"
 * (2026-10-11, was SE5 "Ready to harvest") → the word list.
 * Stages come from the API in UI-5; until then `stageCounts` is null, the
 * tiles show "—" and can't filter, and every word shows as a sprout
 * unless the caller knows better.
 */
export type BedStage = 'seed' | 'sprout' | 'flower' | 'tree';
const STAGES: readonly BedStage[] = ['seed', 'sprout', 'flower', 'tree'];

export interface TopicBedWord {
  id: string;
  word: string;
  meaning: string;
  meaningLang?: string;
  stage: BedStage;
  wilting?: boolean;
  /** Times forgotten; shown after the meaning ("tricky, 5 lapses") when set. */
  lapses?: number;
  /** When it needs water: now, new (never reviewed), or in `days` (null = unknown). */
  due: { tone: 'now' } | { tone: 'new' } | { tone: 'later'; days: number | null };
}

/**
 * "Bees are waiting" (2026-10-11, was SE5): a ripe Flower to say aloud, or
 * one pollinated today (its word check passed at 80%+; shown until tomorrow).
 */
export interface BeeWord {
  id: string;
  word: string;
  /**
   * The line under the word: syllables with the stress ("MI · ti · gate"),
   * else the UK IPA; null = none.
   */
  sound: string | null;
  pollinated: boolean;
  /** Pronunciation (P1) for this word. */
  href: string;
}

export interface TopicBedScreenProps {
  title: string;
  /** "IELTS Academic · B2–C1 · 48 words": each part optional but the count. */
  meta: { collection: string | null; level: string | null; words: number };
  backHref: string;
  stageCounts: Record<BedStage, number> | null;
  words: readonly TopicBedWord[];
  initialStage?: BedStage | null;
  /** Null when nothing in the bed is due (reviewed words only, as on A6). */
  water: { count: number; href: string } | null;
  /**
   * "Plant N new": a planting session of this bed's seeds. Takes the main
   * button's place when nothing is due, else sits under it. Null / omitted
   * hides it (no seeds left).
   */
  plant?: { count: number; href: string } | null;
  quizHref: string;
  addWordHref: string;
  /** Opens the Add word sheet in place; when omitted, + goes to `addWordHref`. */
  onAddWord?: () => void;
  optionsHref?: string;
  /** A7c: the search button left of ⋯ (search this bed's words); omitted hides it. */
  searchHref?: string;
  /**
   * SE2 (Phase 13): "Speak · 5 sentences from this bed", The Pond for this
   * bed. Null / omitted hides it (no word here has a speaking item).
   */
  speak?: { count: number; href: string } | null;
  /**
   * "Bees are waiting" (was SE5): ripe words to say for their fruit (90%+,
   * no SRS change, D-3). `waiting` = rows still to say; `sayAllHref` runs
   * them in a row (null when none wait). Null / omitted / empty hides it.
   */
  bees?: { waiting: number; sayAllHref: string | null; words: readonly BeeWord[] } | null;
  /** Wilting rows link here (the leech drill, U5-6); omitted = static rows. */
  wiltingHref?: string;
  /** Master list under the iPad sidebar's tabs at `lg` (the topic beds). */
  sidebar?: React.ReactNode;
}

export function TopicBedScreen({
  title,
  meta,
  backHref,
  stageCounts,
  words,
  initialStage = null,
  water,
  plant,
  quizHref,
  addWordHref,
  onAddWord,
  optionsHref,
  searchHref,
  speak,
  bees,
  wiltingHref,
  sidebar,
}: TopicBedScreenProps) {
  const t = useTranslations('screens.bed');
  const topicsT = useTranslations('screens.topics');
  const f = useGardenFormat();
  const router = useRouter();
  const [stage, setStage] = React.useState<BedStage | null>(initialStage);
  const shown = words.filter((word) => !stage || word.stage === stage);
  const dueText = (due: TopicBedWord['due']) =>
    due.tone === 'now'
      ? t('dueNow')
      : due.tone === 'new'
        ? t('new')
        : due.days === null
          ? ''
          : t('inDays', { count: due.days });

  return (
    <div
      className={gcn(
        SCREEN_CLASSES,
        IPAD_NAV_COLUMN,
        'gap-[14px] px-4 pt-5 ipad:pl-24 ipad-lg:pl-64',
      )}
    >
      <header className="flex items-center gap-3">
        <IconButton asChild aria-label={t('back')}>
          <Link href={backHref}>
            <BackIcon width={20} height={20} />
          </Link>
        </IconButton>
        <div className="flex flex-grow flex-col">
          <h1 className="font-display text-[26px] font-semibold leading-[1.1]">{title}</h1>
          <span className="text-[13px] text-muted-foreground">
            {[meta.collection, meta.level, t('wordsCount', { count: meta.words })]
              .filter(Boolean)
              .join(topicsT('separator'))}
          </span>
        </div>
        {searchHref ? (
          <IconButton asChild aria-label={t('searchWords', { topic: title })}>
            <Link href={searchHref}>
              <SearchIcon width={20} height={20} />
            </Link>
          </IconButton>
        ) : null}
        <IconButton
          aria-label={t('options')}
          onClick={optionsHref ? () => router.push(optionsHref) : undefined}
          disabled={!optionsHref}
          className="disabled:opacity-100"
        >
          <MoreIcon width={20} height={20} />
        </IconButton>
      </header>

      <div role="group" aria-label={t('stagesLabel')} className="grid grid-cols-4 gap-2">
        {STAGES.map((id) => (
          <StageTile
            key={id}
            stage={id}
            count={stageCounts ? f.number(stageCounts[id]) : t('unknown')}
            label={t(`stage.${id}`)}
            selected={stage === id}
            disabled={!stageCounts}
            className="disabled:opacity-100"
            onClick={() => setStage((current) => (current === id ? null : id))}
          />
        ))}
      </div>

      <div className="flex gap-2">
        {water ? (
          <Link
            href={water.href}
            className={buttonClassName('primary', {
              className: 'h-[52px] flex-grow rounded-control text-[16px] md:max-w-none',
            })}
          >
            <WaterIcon width={20} height={20} fill="var(--color-surface)" />
            {t('water', { count: water.count })}
          </Link>
        ) : plant ? (
          <Link
            href={plant.href}
            className={buttonClassName('primary', {
              className: 'h-[52px] flex-grow rounded-control text-[16px] md:max-w-none',
            })}
          >
            <SeedIcon width={20} height={20} />
            {t('plant', { count: plant.count })}
          </Link>
        ) : (
          <span className="flex h-[52px] flex-grow items-center justify-center rounded-control bg-surface-sunken text-[15px] font-semibold text-muted-foreground">
            {t('nothingDue')}
          </span>
        )}
        <Link
          href={quizHref}
          className={buttonClassName('secondary', { className: 'box-content text-[15px]' })}
        >
          {t('quiz')}
        </Link>
        <IconButton
          aria-label={t('addWord')}
          onClick={onAddWord ?? (() => router.push(addWordHref))}
          className="h-[52px] w-[52px] rounded-control text-forest"
        >
          <PlusIcon width={20} height={20} />
        </IconButton>
      </div>

      {water && plant ? (
        <Link
          href={plant.href}
          className="-mt-1 box-content flex h-[50px] shrink-0 items-center justify-center gap-2 rounded-[16px] border border-forest-wash-border bg-forest-wash text-[15px] font-bold text-forest"
        >
          <SeedIcon width={20} height={20} />
          {t('plant', { count: plant.count })}
        </Link>
      ) : null}

      {speak ? (
        <Link
          href={speak.href}
          className="-mt-1 box-content flex h-[50px] shrink-0 items-center justify-center gap-2 rounded-[16px] border border-primary-border bg-primary-soft text-[15px] font-bold text-primary-text"
        >
          <MicIcon width={20} height={20} />
          {t('speak')}
          {topicsT('separator')}
          {t('speakSentences', { count: speak.count })}
        </Link>
      ) : null}

      {bees && bees.words.length > 0 ? (
        <section
          aria-labelledby="bed-bees-title"
          className="flex shrink-0 flex-col gap-2 rounded-[20px] border border-gold-border bg-gold-soft p-3"
        >
          <div className="flex items-center gap-2">
            <BeeGlyph size={26} />
            <h2
              id="bed-bees-title"
              className="flex-grow font-display text-[18px] font-semibold leading-[23px]"
            >
              {t('bees.title')}
            </h2>
            {bees.sayAllHref ? (
              <Link
                href={bees.sayAllHref}
                className="whitespace-nowrap text-[13px] font-bold text-primary-text"
              >
                {t('bees.sayAll')}
              </Link>
            ) : null}
          </div>
          <p className="-mt-1 text-[13px] leading-[1.4] text-gold-soft-text">
            {bees.waiting > 0 ? t('bees.intro', { count: bees.waiting }) : t('bees.allDone')}
          </p>
          <ul className="flex flex-col gap-2">
            {bees.words.map((w) => (
              <li
                key={w.id}
                className={gcn(
                  'box-border flex min-h-14 items-center gap-3 rounded-[14px] border py-1.5 pl-2 pr-1.5',
                  w.pollinated
                    ? 'border-forest-wash-border bg-forest-wash'
                    : 'border-gold-border bg-surface',
                )}
              >
                <span className="relative flex h-10 w-[34px] shrink-0 items-end justify-center">
                  {w.pollinated ? (
                    <span className="spark flex">
                      <BeeFlower pollinated />
                    </span>
                  ) : (
                    <>
                      <BeeFlower pollinated={false} />
                      <span className="absolute -right-1 -top-2.5">
                        <BeeGlyph size={20} />
                      </span>
                    </>
                  )}
                </span>
                <span className="flex min-w-0 flex-grow flex-col leading-[1.25]">
                  <span lang="en" className="text-[16px] font-bold">
                    {w.word}
                  </span>
                  {w.sound ? (
                    <span lang="en" className="text-[12px] tracking-[.02em] text-gold-soft-text">
                      {w.sound}
                    </span>
                  ) : null}
                  <span
                    className={gcn(
                      'text-[12px] font-semibold',
                      w.pollinated ? 'text-success' : 'text-primary-text',
                    )}
                  >
                    {w.pollinated ? t('bees.pollinated') : t('bees.waitingRow')}
                  </span>
                </span>
                {w.pollinated ? (
                  <span className="spark mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-surface">
                    <CheckIcon width={18} height={18} />
                  </span>
                ) : (
                  <Link
                    href={w.href}
                    aria-label={t('bees.say', { word: w.word })}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-surface shadow-[0_3px_0_var(--color-primary-shadow)]"
                  >
                    <MicIcon width={20} height={20} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[18px] font-semibold">
          {stage ? t(`stageTitle.${stage}`) : t('allWords')}
        </h2>
        <span className="text-[12px] text-muted-foreground">{t('sorted')}</span>
      </div>

      <ul className="flex flex-grow flex-col gap-2 ipad:grid ipad:grid-cols-2 ipad:content-start">
        {shown.map((word) => (
          <li key={word.id}>
            <WordRow
              word={word.word}
              meaning={
                word.lapses
                  ? t('tricky', { meaning: word.meaning, count: word.lapses })
                  : word.meaning
              }
              meaningLang={word.meaningLang}
              stage={word.wilting ? 'wilting' : word.stage}
              variant={word.wilting ? 'wilting' : 'normal'}
              dueText={dueText(word.due)}
              dueTone={word.due.tone}
              {...(word.wilting && wiltingHref ? { href: wiltingHref } : {})}
            />
          </li>
        ))}
        {shown.length === 0 ? (
          <EmptyState
            as="li"
            body={words.length === 0 ? t('emptyBed') : t('empty')}
            className="ipad:col-span-2"
          />
        ) : null}
      </ul>

      <GardenTabBar active="topics" bar={false} sidebar={sidebar} />
    </div>
  );
}
