'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Chip } from '../Chip';
import { gcn } from '../cn';
import { ChevronRightIcon, PlusIcon, SearchIcon } from '../icons';
import { IconButton } from '../IconButton';
import type { PlantStage } from '../plantStage';
import { LockedTopicRow, TopicRow } from '../TopicRow';
import { GardenTabBar, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A6 · Topics, the garden beds (canvas `reference/A6-topics`).
 *
 * Header (count of beds and words, search) → filter chips (they work) →
 * one row per topic → the locked seed pack → "Plant a new bed" → tab bar.
 * Stage counts and due counts are optional per topic: the bar and badge
 * only show when the API provides them (UI-5).
 */
export interface TopicsScreenTopic {
  id: string;
  href: string;
  title: string;
  /** Filter group id (matches one of `filters`). */
  group: string;
  level: string | null;
  words: number;
  /** Words per stage; `seed` is optional (older APIs only sent the others). */
  stages: { tree: number; flower: number; sprout: number; seed?: number } | null;
  due: number | null;
}

export interface TopicsScreenProps {
  topics: readonly TopicsScreenTopic[];
  /** Filter chips after "All": id + label (e.g. { id: 'academic', label: 'IELTS Academic' }). */
  filters: ReadonlyArray<{ id: string; label: string }>;
  initialFilter?: string;
  /**
   * Locked seed pack: `bloomsNeeded` more Golden Blooms this week unlock
   * it; `groups` lists the filters it shows under.
   */
  lockedPack: { name: string; bloomsNeeded: number; groups: readonly string[] } | null;
  /** Search: `onSearch` (e.g. open a sheet) wins over `searchHref`; omit both to hide it. */
  searchHref?: string;
  onSearch?: () => void;
  /** "Plant a new bed": `onNewBed` (e.g. open a sheet) wins over `newBedHref`. */
  newBedHref?: string;
  onNewBed?: () => void;
  /** UI-G: with the "Group" chip selected, a link to the shared gardens. */
  groupsHref?: string;
  stickyNav?: boolean;
}

/**
 * The plant on a bed's tile: the stage most of its words are in. Ties go
 * to the more grown stage (tree > flower > sprout > seed), as in the
 * canvas. A bed with no words, or whose words are all unreviewed, is a
 * seed; with no stage data at all it's a sprout (never a tree, which
 * would claim fruit the learner hasn't grown).
 */
export function leadingStage(stages: TopicsScreenTopic['stages'], words = 0): PlantStage {
  if (words === 0) return 'seed';
  if (!stages) return 'sprout';
  const ranked: Array<[PlantStage, number]> = [
    ['tree', stages.tree],
    ['flower', stages.flower],
    ['sprout', stages.sprout],
    ['seed', stages.seed ?? 0],
  ];
  const top = Math.max(...ranked.map(([, count]) => count));
  if (top <= 0) return stages.seed === undefined ? 'sprout' : 'seed';
  return ranked.find(([, count]) => count === top)![0];
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export function TopicsScreen({
  topics,
  filters,
  initialFilter = 'all',
  lockedPack,
  searchHref,
  onSearch,
  newBedHref,
  onNewBed,
  groupsHref,
  stickyNav = true,
}: TopicsScreenProps) {
  const t = useTranslations('screens.topics');
  const router = useRouter();
  const [filter, setFilter] = React.useState(initialFilter);

  const shown = topics.filter((topic) => filter === 'all' || topic.group === filter);
  const totalWords = topics.reduce((sum, topic) => sum + topic.words, 0);
  const chips = [{ id: 'all', label: t('all') }, ...filters];

  return (
    <div className={gcn(SCREEN_CLASSES, 'gap-[14px] pt-[22px]')}>
      <header className="flex items-end gap-3 px-5">
        <div className="flex flex-grow flex-col">
          <span className="text-[13px] font-medium text-garden-muted">
            {t('summary', { beds: topics.length, words: totalWords })}
          </span>
          <h1 className="font-display text-[28px] font-semibold leading-[1.1]">{t('title')}</h1>
        </div>
        {onSearch || searchHref ? (
          <IconButton
            aria-label={onSearch ? t('searchBeds') : t('search')}
            onClick={() => (onSearch ? onSearch() : searchHref && router.push(searchHref))}
          >
            <SearchIcon width={20} height={20} />
          </IconButton>
        ) : null}
      </header>

      <div role="group" aria-label={t('filterLabel')} className="flex gap-2 px-4">
        {chips.map((chip) => (
          <Chip key={chip.id} selected={filter === chip.id} onClick={() => setFilter(chip.id)}>
            {chip.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-col gap-2 px-4">
        {shown.map((topic) => {
          const meta = [
            t('words', { count: topic.words }),
            topic.level,
            topic.stages ? t('fruiting', { count: topic.stages.tree }) : null,
          ]
            .filter(Boolean)
            .join(t('separator'));
          return (
            <TopicRow
              key={topic.id}
              href={topic.href}
              title={topic.title}
              meta={meta}
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
          );
        })}
        {topics.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-garden-muted">{t('empty')}</p>
        ) : null}
        {lockedPack && (filter === 'all' || lockedPack.groups.includes(filter)) ? (
          <LockedTopicRow
            title={lockedPack.name}
            hint={t('lockedHint', { count: lockedPack.bloomsNeeded })}
            lockedLabel={t('locked')}
          />
        ) : null}
        {groupsHref && filter === 'group' ? (
          <Link
            href={groupsHref}
            className="flex h-12 items-center justify-center gap-1 rounded-[18px] border border-garden-border bg-garden-surface text-[15px] font-bold text-garden-forest"
          >
            {t('openGroups')}
            <ChevronRightIcon width={16} height={16} />
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => (onNewBed ? onNewBed() : newBedHref && router.push(newBedHref))}
          className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-dashed border-garden-dashed bg-transparent text-[15px] font-bold text-garden-forest"
        >
          <PlusIcon width={20} height={20} />
          {t('newBed')}
        </button>
      </div>

      <GardenTabBar active="topics" sticky={stickyNav} />
    </div>
  );
}
