'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useGroups } from '@/hooks/useGroups';
import { useCreateTopic } from '@/hooks/useTopicMutations';
import { useTopics } from '@/hooks/useTopics';

import { BottomSheet } from '../BottomSheet';
import { Button } from '../Button';
import { TopicsScreen, type TopicsScreenTopic } from '../screens/TopicsScreen';
import { sortBedsByDue, toScreenTopic, topicFilters, type GardenTopicSummary } from './data';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden/topics: the beds (A6) from GET /topics.
 *
 * Real: title, word count, CEFR range, fruiting / flowering / sprouting
 * shares, due badge and the filter chips (library collections, Mine)
 * from the UI-5 fields; shared beds show under All (NAV-1: no Group chip).
 * Beds are sorted by due words, thirstiest first (U5-2). Search opens a sheet that finds beds by
 * name; "Plant a new bed" opens a sheet that creates the topic
 * (POST /topics, existing) and opens it. The locked seed pack waits for
 * UI-6 (Golden Blooms), so it isn't shown.
 */
export function TopicsLive() {
  const t = useTranslations('screens.topics');
  const topics = useTopics();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [newBedOpen, setNewBedOpen] = React.useState(false);

  if (topics.isPending) return <LiveLoading />;
  if (topics.isError || !topics.data) return <LiveError onRetry={() => void topics.refetch()} />;

  // Beds with the most words due come first (U5-2).
  const beds = sortBedsByDue(
    (topics.data as GardenTopicSummary[]).map((topic) =>
      toScreenTopic(topic, t('library'), t('shared')),
    ),
  );

  return (
    <>
      <TopicsScreen
        topics={beds}
        filters={topicFilters(beds, { mine: t('mine') })}
        lockedPack={null}
        onSearch={() => setSearchOpen(true)}
        onNewBed={() => setNewBedOpen(true)}
      />
      <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} beds={beds} />
      <NewBedSheet open={newBedOpen} onOpenChange={setNewBedOpen} />
    </>
  );
}

const INPUT =
  'h-12 w-full rounded-control border border-garden-border bg-garden-surface px-4 text-[16px] text-garden-text placeholder:text-garden-muted';

function SearchSheet({
  open,
  onOpenChange,
  beds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beds: readonly TopicsScreenTopic[];
}) {
  const t = useTranslations('screens.topics');
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const q = query.trim().toLocaleLowerCase();
  const matches = q ? beds.filter((bed) => bed.title.toLocaleLowerCase().includes(q)) : beds;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t('searchTitle')}>
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className={INPUT}
      />
      <ul className="mt-3 flex flex-col">
        {matches.map((bed) => (
          <li key={bed.id}>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                router.push(bed.href);
              }}
              className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-garden-divider py-2 text-left"
            >
              <span className="text-[15px] font-semibold">{bed.title}</span>
              <span className="shrink-0 text-[12px] text-garden-muted">
                {t('words', { count: bed.words })}
              </span>
            </button>
          </li>
        ))}
        {matches.length === 0 ? (
          <li className="py-4 text-center text-[13px] text-garden-muted">
            {t('searchEmpty', { query: query.trim() })}
          </li>
        ) : null}
      </ul>
    </BottomSheet>
  );
}

function NewBedSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('screens.topics');
  const router = useRouter();
  const groups = useGroups();
  const create = useCreateTopic();
  const writable = (groups.data ?? []).filter((g) => g.role === 'ADMIN' || g.role === 'WRITE');
  const [title, setTitle] = React.useState('');
  const [groupId, setGroupId] = React.useState('');
  const chosen = groupId || writable[0]?.id || '';

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !chosen) return;
    create.mutate(
      { groupId: chosen, title: title.trim() },
      {
        onSuccess: (topic) => {
          onOpenChange(false);
          setTitle('');
          router.push(GARDEN_ROUTES.topic(topic.id));
        },
      },
    );
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('newBedTitle')}
      description={t('newBedDescription')}
      footer={
        <Button
          type="submit"
          form="garden-new-bed"
          className="w-full"
          loading={create.isPending}
          disabled={!title.trim() || !chosen}
        >
          {t('newBedSubmit')}
        </Button>
      }
    >
      <form id="garden-new-bed" onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-garden-muted">
          {t('newBedName')}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            className={INPUT}
          />
        </label>
        {writable.length > 1 ? (
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-garden-muted">
            {t('newBedGroup')}
            <select
              value={chosen}
              onChange={(event) => setGroupId(event.target.value)}
              className={INPUT}
            >
              {writable.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {groups.data && writable.length === 0 ? (
          <p className="text-[13px] text-garden-primary-text">{t('newBedNoGroup')}</p>
        ) : null}
        {create.isError ? (
          <p role="alert" className="text-[13px] text-garden-primary-text">
            {t('newBedError')}
          </p>
        ) : null}
      </form>
    </BottomSheet>
  );
}
