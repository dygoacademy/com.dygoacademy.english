'use client';

import * as React from 'react';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useGroupGardenCounts } from '@/hooks/useGroupGarden';
import { useCreateGroup, useGroups } from '@/hooks/useGroups';
import { apiClient } from '@/lib/api-client';
import type { GroupRosterMember } from '@/types';

import { CreateGardenBody } from '../CreateGardenSheet';
import { GroupSheet } from '../GroupSheet';
import { SharedGardensScreen } from '../screens/SharedGardensScreen';
import { avatarRow, gardenPlant, tokenFromLink } from './groupData';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden/groups: GR1 on GET /groups (name, your role), GET
 * /groups/garden-counts (UI-G: sizes and your due words; the cards still
 * render without it) and each group's roster for the initials (RLS: a
 * Viewer sees only themself). "+" and "Start a garden" open GR7
 * (POST /groups, then the new garden); "Join with a link" takes a pasted
 * invite link to GR6.
 *
 * Rain days aren't stored by the backend yet, so the rain-day banner
 * doesn't show on live data.
 */
export function GroupsLive() {
  const t = useTranslations('screens.groups.list');
  const groups = useGroups();
  const counts = useGroupGardenCounts();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [joinOpen, setJoinOpen] = React.useState(false);

  const rosters = useQueries({
    queries: (groups.data ?? []).map((group) => ({
      queryKey: ['groups', group.id, 'members'],
      queryFn: () => apiClient.get<GroupRosterMember[]>(`/groups/${group.id}/members`),
    })),
  });

  if (groups.isPending) return <LiveLoading />;
  if (groups.isError || !groups.data) return <LiveError onRetry={() => void groups.refetch()} />;

  const byId = new Map((counts.data ?? []).map((row) => [row.group_id, row]));
  const gardens = groups.data.map((group, index) => {
    const size = byId.get(group.id);
    const roster = rosters[index]?.data ?? [];
    const members = size?.member_count ?? roster.length;
    return {
      id: group.id,
      href: GARDEN_ROUTES.group(group.id),
      name: group.name,
      role: group.role,
      meta: size
        ? t('cardMeta', { members: size.member_count, beds: size.bed_count, words: size.word_count })
        : '',
      plant: gardenPlant(size?.word_count ?? 0),
      avatars: avatarRow(roster, members),
      due: size ? size.my_due_count : null,
    };
  });
  const gardeners = (counts.data ?? []).reduce((sum, row) => sum + row.member_count, 0);

  return (
    <SharedGardensScreen
      gardens={gardens}
      gardeners={gardeners}
      rainDay={null}
      start={{ onClick: () => setCreateOpen(true) }}
      join={{ onClick: () => setJoinOpen(true) }}
    >
      <CreateGardenSheet open={createOpen} onOpenChange={setCreateOpen} />
      <JoinWithLinkSheet open={joinOpen} onOpenChange={setJoinOpen} />
    </SharedGardensScreen>
  );
}

function CreateGardenSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('screens.groups.create');
  const router = useRouter();
  const create = useCreateGroup();
  const [name, setName] = React.useState('');
  const [about, setAbout] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <GroupSheet open={open} onOpenChange={onOpenChange} title={t('title')} subtitle={t('subtitle')}>
      <CreateGardenBody
        name={name}
        about={about}
        open={isPublic}
        onNameChange={setName}
        onAboutChange={setAbout}
        onOpenChange={setIsPublic}
        namePlaceholder={t('namePlaceholder')}
        aboutPlaceholder={t('aboutPlaceholder')}
        submitLabel={t('submit')}
        note={t('note')}
        busy={create.isPending}
        error={error}
        onSubmit={() => {
          setError(null);
          create.mutate(
            {
              name: name.trim(),
              ...(about.trim() ? { description: about.trim() } : {}),
              isPublic,
            },
            {
              onSuccess: (group) => {
                onOpenChange(false);
                setName('');
                setAbout('');
                router.push(GARDEN_ROUTES.group(group.id));
              },
              onError: () => setError(t('failed')),
            },
          );
        }}
      />
    </GroupSheet>
  );
}

function JoinWithLinkSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('screens.groups.list');
  const router = useRouter();
  const [value, setValue] = React.useState('');
  const [invalid, setInvalid] = React.useState(false);
  const fieldId = React.useId();

  return (
    <GroupSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('joinTitle')}
      subtitle={t('joinSubtitle')}
    >
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          const token = tokenFromLink(value);
          if (!token) {
            setInvalid(true);
            return;
          }
          onOpenChange(false);
          router.push(GARDEN_ROUTES.join(token));
        }}
      >
        <label htmlFor={fieldId} className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[.08em] text-garden-muted">
            {t('joinField')}
          </span>
          <input
            id={fieldId}
            value={value}
            inputMode="url"
            autoComplete="off"
            placeholder={t('joinPlaceholder')}
            onChange={(event) => {
              setValue(event.target.value);
              setInvalid(false);
            }}
            aria-invalid={invalid || undefined}
            className="min-h-12 w-full rounded-[14px] border border-garden-border bg-garden-surface px-[14px] py-3 text-[16px] outline-none placeholder:text-garden-placeholder focus:border-garden-forest"
          />
        </label>
        {invalid ? (
          <p role="alert" className="px-1 text-[13px] text-garden-primary-text">
            {t('joinInvalid')}
          </p>
        ) : null}
        <button
          type="submit"
          className="flex h-14 items-center justify-center rounded-[18px] bg-garden-primary text-[17px] font-bold text-white shadow-press-primary active:translate-y-[2px]"
        >
          {t('joinGo')}
        </button>
      </form>
    </GroupSheet>
  );
}
