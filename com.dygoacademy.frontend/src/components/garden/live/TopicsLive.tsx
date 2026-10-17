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
import { TopicsScreen, useTopicFilterLabels } from '../screens/TopicsScreen';
import { sortBedsByDue, toScreenTopic, topicFilters, type GardenTopicSummary } from './data';
import { LiveError, LiveLoading } from './LiveState';
import { TopicBedsSidebar } from './SidebarLists';

/**
 * /topics: the beds (A6) from GET /topics.
 *
 * Real: title, word count, CEFR range, fruiting / flowering / sprouting
 * shares, due badge and the filter chips from the UI-5 fields. The chips
 * are the fixed groups (2026-10-17: Mine, Academic, General, Work,
 * Travel, Shared) that have beds, from `filter_group`.
 * Beds are sorted by due words, thirstiest first (U5-2). Search opens A6b
 * (/topics/search, 2026-10-11; was a sheet finding beds by name); "Plant a new bed" opens a sheet that creates the topic
 * (POST /topics, existing) and opens it. The locked seed pack waits for
 * UI-6 (Golden Blooms), so it isn't shown.
 */
export function TopicsLive() {
  const t = useTranslations('screens.topics');
  const filterLabels = useTopicFilterLabels();
  const topics = useTopics();
  const [newBedOpen, setNewBedOpen] = React.useState(false);

  if (topics.isPending) return <LiveLoading />;
  if (topics.isError || !topics.data) return <LiveError onRetry={() => void topics.refetch()} />;

  // Beds with the most words due come first (U5-2).
  const beds = sortBedsByDue(
    (topics.data as GardenTopicSummary[]).map((topic) =>
      toScreenTopic(topic, t('shared')),
    ),
  );

  return (
    <>
      <TopicsScreen
        topics={beds}
        filters={topicFilters(beds, filterLabels)}
        lockedPack={null}
        searchHref={GARDEN_ROUTES.topicsSearch}
        onNewBed={() => setNewBedOpen(true)}
        sidebar={<TopicBedsSidebar />}
      />
      <NewBedSheet open={newBedOpen} onOpenChange={setNewBedOpen} />
    </>
  );
}

const INPUT =
  'h-12 w-full rounded-control border border-border bg-surface px-4 text-[16px] text-text placeholder:text-muted-foreground';

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
  // '' = the learner's own garden (personal group), the default.
  const [groupId, setGroupId] = React.useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    create.mutate(
      { groupId: groupId || undefined, title: title.trim() },
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
          disabled={!title.trim()}
        >
          {t('newBedSubmit')}
        </Button>
      }
    >
      <form id="garden-new-bed" onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-muted-foreground">
          {t('newBedName')}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            className={INPUT}
          />
        </label>
        {writable.length > 0 ? (
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-muted-foreground">
            {t('newBedGroup')}
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className={INPUT}
            >
              <option value="">{t('newBedJustMe')}</option>
              {writable.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {create.isError ? (
          <p role="alert" className="text-[13px] text-primary-text">
            {t('newBedError')}
          </p>
        ) : null}
      </form>
    </BottomSheet>
  );
}
