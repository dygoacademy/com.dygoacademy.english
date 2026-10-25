'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Chip } from '../Chip';
import { gcn } from '../cn';
import { EmptyState } from '../EmptyState';
import { PlusIcon, SearchIcon } from '../icons';
import { IconButton } from '../IconButton';
import type { PlantStage } from '../plantStage';
import { TOPIC_FILTER_GROUPS, type TopicFilterGroup } from '../live/data';
import { LockedTopicRow, TopicRow } from '../TopicRow';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './GardenTabBar';

/**
 * A6 · Topics, the garden beds (canvas `reference/A6-topics`).
 *
 * Header (count of beds and words, search) → filter chips (they work) →
 * one row per topic → the locked seed pack → "Plant a new bed" → tab bar.
 * Stage counts and due counts are optional per topic: the bar and badge
 * only show when the API provides them (UI-5).
 *
 * 2026-10-17: the chips are fixed groups (All, Mine, Academic, General,
 * Work, Travel, Shared) in a sideways slider that never wraps; the list
 * scrolls under the header and the tab bar stays put.
 */
export interface TopicsScreenTopic {
  id: string;
  href: string;
  title: string;
  /** Filter group id (matches one of `filters`); null = All only. */
  group: string | null;
  level: string | null;
  words: number;
  /** Words per stage; `seed` is optional (older APIs only sent the others). */
  stages: { tree: number; flower: number; sprout: number; seed?: number } | null;
  due: number | null;
}

export interface TopicsScreenProps {
  topics: readonly TopicsScreenTopic[];
  /** Filter chips after "All": id + label (e.g. { id: 'academic', label: 'Academic' }). */
  filters: ReadonlyArray<{ id: string; label: string }>;
  initialFilter?: string;
  /**
   * Locked seed pack: `bloomsNeeded` more Golden Blooms this week unlock
   * it; `groups` lists the filters it shows under.
   */
  lockedPack: { name: string; bloomsNeeded: number; groups: readonly string[] } | null;
  /** Search (A6b): `onSearch` wins over `searchHref` (a link); omit both to hide it. */
  searchHref?: string;
  onSearch?: () => void;
  /** "Plant a new bed": `onNewBed` (e.g. open a sheet) wins over `newBedHref`. */
  newBedHref?: string;
  onNewBed?: () => void;
  stickyNav?: boolean;
  /** Master list under the iPad sidebar's tabs at `lg` (GardenSidebarList). */
  sidebar?: React.ReactNode;
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

/** The fixed filter groups' labels in the page's language (`screens.topics.filters`). */
export function useTopicFilterLabels(): Record<TopicFilterGroup, string> {
  const t = useTranslations('screens.topics.filters');
  return Object.fromEntries(TOPIC_FILTER_GROUPS.map((id) => [id, t(id)])) as Record<
    TopicFilterGroup,
    string
  >;
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * A6 filter chips as a sideways slider (2026-10-17): one row that scrolls
 * when the chips don't fit, scrollbar hidden, a cream fade on each edge
 * that has more. Picking a chip scrolls it to the middle, and so does the
 * first render when the initial chip is out of view.
 *
 * 2026-10-25: the row only pans sideways (a drag on it never moves the
 * page up or down) and its overscroll stays inside the row.
 */
export function FilterChipRow({
  chips,
  selected,
  onSelect,
  label,
}: {
  chips: ReadonlyArray<{ id: string; label: string }>;
  selected: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [fade, setFade] = React.useState({ left: false, right: false });

  const updateFades = React.useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const max = row.scrollWidth - row.clientWidth;
    const left = row.scrollLeft > 1;
    const right = row.scrollLeft < max - 1;
    setFade((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  // Scrolls the row only: scrollIntoView also scrolls every scrollable
  // ancestor, which nudged the whole page up or sideways on phones.
  const scrollToChip = React.useCallback((id: string, smooth: boolean) => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-filter="${id}"]`);
    if (!row || !chip) return;
    const start = chip.offsetLeft - row.offsetLeft;
    row.scrollTo?.({
      left: start + chip.offsetWidth / 2 - row.clientWidth / 2,
      behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
    });
  }, []);

  React.useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-filter="${selected}"]`);
    if (row && chip) {
      const start = chip.offsetLeft - row.offsetLeft;
      const outOfView =
        start < row.scrollLeft || start + chip.offsetWidth > row.scrollLeft + row.clientWidth;
      if (outOfView) scrollToChip(selected, false);
    }
    updateFades();
    window.addEventListener('resize', updateFades);
    return () => window.removeEventListener('resize', updateFades);
    // First render only: later picks scroll in `pick`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(id: string) {
    onSelect(id);
    scrollToChip(id, true);
  }

  return (
    <div className="relative shrink-0">
      <div
        ref={rowRef}
        role="group"
        aria-label={label}
        onScroll={updateFades}
        className="flex touch-pan-x touch-pinch-zoom gap-2 overflow-x-auto overflow-y-hidden overscroll-contain scroll-px-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map((chip) => (
          <Chip
            key={chip.id}
            data-filter={chip.id}
            title={chip.label}
            selected={selected === chip.id}
            onClick={() => pick(chip.id)}
            className="max-w-[200px] px-3"
          >
            <span className="truncate">{chip.label}</span>
          </Chip>
        ))}
      </div>
      {fade.left ? (
        <span
          aria-hidden="true"
          data-fade="left"
          className="pointer-events-none absolute inset-y-0 left-0 w-7 bg-[linear-gradient(to_left,rgba(244,241,234,0),#F4F1EA_85%)]"
        />
      ) : null}
      {fade.right ? (
        <span
          aria-hidden="true"
          data-fade="right"
          className="pointer-events-none absolute inset-y-0 right-0 w-9 bg-[linear-gradient(to_right,rgba(244,241,234,0),#F4F1EA_85%)]"
        />
      ) : null}
    </div>
  );
}

export function TopicsScreen({
  topics,
  filters,
  initialFilter = 'all',
  lockedPack,
  searchHref,
  onSearch,
  newBedHref,
  onNewBed,
  stickyNav = true,
  sidebar,
}: TopicsScreenProps) {
  const t = useTranslations('screens.topics');
  const router = useRouter();
  const [filter, setFilter] = React.useState(initialFilter);

  const shown = topics.filter((topic) => filter === 'all' || topic.group === filter);
  const totalWords = topics.reduce((sum, topic) => sum + topic.words, 0);
  const chips = [{ id: 'all', label: t('filters.all') }, ...filters];

  return (
    <div className={gcn(SCREEN_CLASSES, IPAD_NAV_COLUMN, 'h-screen-dvh gap-[14px] overflow-x-clip pt-[22px]')}>
      <header className="flex shrink-0 items-end gap-3 px-5">
        <div className="flex flex-grow flex-col">
          <span className="text-[13px] font-medium text-muted-foreground">
            {t('summary', { beds: topics.length, words: totalWords })}
          </span>
          <h1 className="font-display text-[28px] font-semibold leading-[1.1]">{t('title')}</h1>
        </div>
        {onSearch ? (
          <IconButton aria-label={t('searchBeds')} onClick={onSearch}>
            <SearchIcon width={20} height={20} />
          </IconButton>
        ) : searchHref ? (
          <IconButton asChild aria-label={t('searchBeds')}>
            <Link href={searchHref}>
              <SearchIcon width={20} height={20} />
            </Link>
          </IconButton>
        ) : null}
      </header>

      <FilterChipRow
        chips={chips}
        selected={filter}
        onSelect={setFilter}
        label={t('filterLabel')}
      />

      {/* Design system §10, A6: bed cards in 2 columns on iPad. The list scrolls (up and down only), the tab bar stays. */}
      <div className="flex min-h-0 flex-1 touch-pan-y touch-pinch-zoom flex-col gap-2 overflow-y-auto overflow-x-hidden overscroll-contain px-4 ipad:grid ipad:grid-cols-2 ipad:content-start ipad:gap-2.5">
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
              titleText={topic.title}
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
          <EmptyState as="p" body={t('empty')} className="ipad:col-span-2" />
        ) : null}
        {lockedPack && (filter === 'all' || lockedPack.groups.includes(filter)) ? (
          <LockedTopicRow
            title={lockedPack.name}
            hint={t('lockedHint', { count: lockedPack.bloomsNeeded })}
            lockedLabel={t('locked')}
          />
        ) : null}
        <button
          type="button"
          onClick={() => (onNewBed ? onNewBed() : newBedHref && router.push(newBedHref))}
          className="flex h-14 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-dashed border-dashed-line bg-transparent text-[15px] font-bold text-forest"
        >
          <PlusIcon width={20} height={20} />
          {t('newBed')}
        </button>
      </div>

      <GardenTabBar active="topics" sticky={stickyNav} sidebar={sidebar} />
    </div>
  );
}
