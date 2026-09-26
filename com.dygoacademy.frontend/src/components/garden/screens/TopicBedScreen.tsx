'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { buttonClassName } from '../buttonStyles';
import { useGardenFormat } from '../format';
import { BackIcon, MoreIcon, PlusIcon, WaterIcon } from '../icons';
import { IconButton } from '../IconButton';
import { StageTile } from '../StageTile';
import { WordRow } from '../WordRow';

/**
 * A7 · Topic bed (canvas `reference/A7-topic-bed`, and
 * `A7-topic-bed-filter-sprouts` with the Sprouts tile on). No tab bar.
 *
 * Header (Back, title + meta, options) → four stage tiles that filter the
 * list (tap again to clear) → Water / Quiz / Add word → the word list.
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
  optionsHref?: string;
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
  optionsHref,
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
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-garden-bg px-4 pt-5 text-garden-text">
      <header className="flex items-center gap-3">
        <IconButton asChild aria-label={t('back')}>
          <Link href={backHref}>
            <BackIcon width={20} height={20} />
          </Link>
        </IconButton>
        <div className="flex flex-grow flex-col">
          <h1 className="font-display text-[26px] font-semibold leading-[1.1]">{title}</h1>
          <span className="text-[13px] text-garden-muted">
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
          <span className="flex h-[52px] flex-grow items-center justify-center rounded-control bg-garden-surface-sunken text-[15px] font-semibold text-garden-muted">
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
          onClick={() => router.push(addWordHref)}
          className="h-[52px] w-[52px] rounded-control text-garden-forest"
        >
          <PlusIcon width={20} height={20} />
        </IconButton>
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[18px] font-semibold">
          {stage ? t(`stageTitle.${stage}`) : t('allWords')}
        </h2>
        <span className="text-[12px] text-garden-muted">{t('sorted')}</span>
      </div>

      <ul className="flex flex-grow flex-col gap-2">
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
            />
          </li>
        ))}
        {shown.length === 0 ? (
          <li className="py-6 text-center text-[13px] text-garden-muted">{t('empty')}</li>
        ) : null}
      </ul>
    </div>
  );
}
