'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { buttonClassName } from '../buttonStyles';
import { gcn } from '../cn';
import { EmptyState } from '../EmptyState';
import { useGardenFormat } from '../format';
import { BackIcon, ChevronRightIcon, MicIcon, MoreIcon, PlusIcon, WaterIcon } from '../icons';
import { IconButton } from '../IconButton';
import { PlantGlyph } from '../PlantGlyph';
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
 * list (tap again to clear) → Water / Quiz / Add word → the "Speak" row
 * (SE2, `reference/SE2-entry-bed`) → "Ready to harvest" (SE5,
 * `reference/SE5-entry-harvest`) → the word list.
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

/** SE5: a ripe word on "Ready to harvest": a mic to say it, or its picked score. */
export interface HarvestWord {
  id: string;
  word: string;
  meaning: string;
  meaningLang?: string;
  /** Score it was harvested with (shown as Fruit, "Picked · 94%"); null = still a Flower. */
  picked: number | null;
  /** The speaking flow for this word (harvest mode). */
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
  /** Null when nothing in the bed is due. */
  water: { count: number; href: string } | null;
  quizHref: string;
  addWordHref: string;
  /** Opens the Add word sheet in place; when omitted, + goes to `addWordHref`. */
  onAddWord?: () => void;
  optionsHref?: string;
  /**
   * SE2 (Phase 13): "Speak · 5 sentences from this bed", The Pond for this
   * bed. Null / omitted hides it (no word here has a speaking item).
   */
  speak?: { count: number; href: string } | null;
  /**
   * SE5 (Phase 13): ripe words to say for their fruit (90%+, no SRS change,
   * D-3). `count` = flowers on the card. Null / omitted / empty hides it.
   */
  harvest?: { count: number; words: readonly HarvestWord[] } | null;
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
  quizHref,
  addWordHref,
  onAddWord,
  optionsHref,
  speak,
  harvest,
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
              className: 'h-[52px] flex-grow rounded-control text-[16px]',
            })}
          >
            <WaterIcon width={20} height={20} fill="var(--color-surface)" />
            {t('water', { count: water.count })}
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

      {speak ? (
        <Link
          href={speak.href}
          className="box-border flex h-[52px] items-center gap-[10px] rounded-control border border-primary-border bg-primary-soft pl-2 pr-3 text-text"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-surface"
          >
            <MicIcon width={18} height={18} />
          </span>
          <span className="flex-grow text-[15px]">
            <b className="text-primary">{t('speak')}</b>
            <span className="text-muted-foreground">
              {topicsT('separator')}
              {t('speakSentences', { count: speak.count })}
            </span>
          </span>
          <ChevronRightIcon width={20} height={20} className="text-primary" />
        </Link>
      ) : null}

      {harvest && harvest.words.length > 0 ? (
        <section
          aria-labelledby="bed-harvest-title"
          className="flex flex-col gap-1 rounded-[22px] border border-border bg-surface px-[14px] pb-1.5 pt-3"
        >
          <div className="flex items-baseline justify-between">
            <h2 id="bed-harvest-title" className="font-display text-[18px] font-semibold">
              {t('harvest.title')}
            </h2>
            <span className="text-[12px] font-semibold text-gold-text">
              {t('harvest.count', { count: harvest.count })}
            </span>
          </div>
          <p className="mb-1 text-[13px] text-muted-foreground">{t('harvest.body')}</p>
          <ul>
            {harvest.words.map((w) => (
              <li key={w.id} className="flex items-center gap-[10px] border-t border-border py-1.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-end justify-center overflow-hidden rounded-tile bg-background"
                >
                  <PlantGlyph stage={w.picked === null ? 'flower' : 'tree'} size={26} />
                </span>
                <span className="flex min-w-0 flex-grow flex-col">
                  <span lang="en" className="text-[15px] font-bold">
                    {w.word}
                  </span>
                  <span
                    lang={w.meaningLang}
                    className="truncate text-[13px] text-muted-foreground"
                  >
                    {w.meaning}
                  </span>
                </span>
                {w.picked === null ? (
                  <Link
                    href={w.href}
                    aria-label={t('harvest.say', { word: w.word })}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-surface shadow-[0_3px_0_var(--color-primary-shadow)]"
                  >
                    <MicIcon width={20} height={20} />
                  </Link>
                ) : (
                  <span className="flex h-8 shrink-0 items-center rounded-full border border-gold-border bg-gold-soft px-2.5 text-[12px] font-bold text-gold-soft-text">
                    {t('harvest.picked', { score: w.picked })}
                  </span>
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
