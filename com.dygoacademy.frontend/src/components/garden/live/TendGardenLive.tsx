'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTimeZone, useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGroupRainDay, useTrickyPatches } from '@/hooks/useGroupGarden';
import { useGroupMembers, useRemoveMember, useUpdateMemberRole } from '@/hooks/useGroupMembers';
import { useDeleteGroup, useGroups, useUpdateGroup } from '@/hooks/useGroups';
import { useInvites, useRevokeInvite } from '@/hooks/useInvites';
import { useTriggerSprint } from '@/hooks/useTriggerSprint';
import { ApiError } from '@/lib/api-client';
import type { GroupInviteSummary, GroupRole } from '@/types';

import { CreateGardenBody } from '../CreateGardenSheet';
import { todayIn, useGardenFormat } from '../format';
import { GroupSheet } from '../GroupSheet';
import { TendGardenScreen, type RainDaySize } from '../screens/TendGardenScreen';
import { gardenerAvatar, gardenerName } from './groupData';
import { InviteSheetLive } from './InviteSheetLive';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden/groups/[id]/manage (?tab=gardeners): GR3 / GR4, admins only.
 *
 * Everything the classic group pages do, on the existing endpoints:
 * - Tricky patches: GET /groups/:id/tricky-patches (UI-G; last 7 days,
 *   totals only), and "Call a rain day" = POST /notifications/groups/:id/
 *   sprint with `wordsPerGardener` (UI-G RD-4; the backend stores the rain
 *   day, one per group per local day: 409 "already running"; 429 and
 *   other errors show "couldn't be sent"). "Last rain day" is the running
 *   one, else the last finished one (GET /groups/:id/rain-day), done of
 *   gardeners.
 * - Gardeners: the roster with a role picker (PATCH members/:userId) and
 *   remove (DELETE, 409 on the last admin); invite links: list + revoke
 *   (GET /groups/:id/invites, DELETE /invites/:id) and a new link (GR5);
 *   garden settings (PATCH /groups/:id) and delete (DELETE /groups/:id).
 */
export function TendGardenLive({ groupId, tab }: { groupId: string; tab: 'tricky' | 'gardeners' }) {
  const t = useTranslations('screens.groups.tend');
  const roles = useTranslations('components.groups.roles');
  const f = useGardenFormat();
  const timeZone = useTimeZone();

  const groups = useGroups();
  const group = groups.data?.find((row) => row.id === groupId);
  const admin = group?.role === 'ADMIN';
  const me = useCurrentUser();
  const members = useGroupMembers(admin ? groupId : '');
  const invites = useInvites(admin ? groupId : '');
  const tricky = useTrickyPatches(groupId, admin && tab === 'tricky');
  const sprint = useTriggerSprint(groupId);
  const rain = useGroupRainDay(groupId, admin && tab === 'tricky');
  const updateRole = useUpdateMemberRole(groupId);
  const removeMember = useRemoveMember(groupId);

  const [size, setSize] = React.useState<RainDaySize>(10);
  const [rainStatus, setRainStatus] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [linksOpen, setLinksOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  if (groups.isPending) return <LiveLoading />;
  if (groups.isError) return <LiveError onRetry={() => void groups.refetch()} />;
  if (!group || !admin) return <LiveError message={t('adminOnly')} />;

  const roster = members.data ?? [];
  const adminCount = roster.filter((member) => member.role === 'ADMIN').length;
  const live = invites.data ?? [];

  const inviteDetail = (invite: GroupInviteSummary) =>
    [
      roles(invite.grant_role),
      invite.max_uses
        ? t('inviteUses', { used: invite.use_count, max: invite.max_uses })
        : t('inviteUsesOpen', { used: invite.use_count }),
      invite.expires_at
        ? t('inviteExpires', { date: f.shortDay(todayIn(timeZone, new Date(invite.expires_at))) })
        : t('inviteNoExpiry'),
    ].join(' · ');

  function changeRole(userId: string, name: string, next: GroupRole | 'remove') {
    setStatus(null);
    if (next === 'remove') {
      if (!window.confirm(t('removeConfirm', { name }))) return;
      removeMember.mutate(userId, {
        onSuccess: () => setStatus(t('removed', { name })),
        onError: (error) =>
          setStatus(error instanceof ApiError && error.status === 409 ? t('lastAdmin') : t('actionFailed')),
      });
      return;
    }
    updateRole.mutate(
      { userId, role: next },
      {
        onSuccess: () => setStatus(t('roleChanged', { name, role: roles(next) })),
        onError: () => setStatus(t('actionFailed')),
      },
    );
  }

  function startRainDay() {
    setRainStatus(null);
    sprint.mutate(
      { message: t('pushMessage', { group: group!.name, count: size }), wordsPerGardener: size },
      {
        onSuccess: (result) => setRainStatus(t('sent', { count: result.recipients })),
        onError: (error) =>
          setRainStatus(
            error instanceof ApiError && error.status === 409 && /rain day/i.test(error.message)
              ? t('alreadyRunning')
              : t('sendFailed'),
          ),
      },
    );
  }

  const manage = GARDEN_ROUTES.groupManage;
  const lastRain = rain.data?.current ?? rain.data?.last ?? null;

  return (
    <TendGardenScreen
      tab={tab}
      groupName={group.name}
      backHref={GARDEN_ROUTES.group(groupId)}
      trickyHref={manage(groupId, 'tricky')}
      gardenersHref={manage(groupId, 'gardeners')}
      tricky={{
        rows: (tricky.data ?? []).map((row) => ({
          word: row.source_word,
          misses: row.misses,
          gardeners: row.gardeners,
        })),
        message: tricky.isPending ? t('loadingTricky') : tricky.isError ? t('actionFailed') : null,
        rainDay: {
          members: Math.max(0, roster.length - 1),
          size,
          onSize: setSize,
          onStart: startRainDay,
          busy: sprint.isPending,
          last: lastRain
            ? {
                day: f.weekday(todayIn(timeZone, new Date(lastRain.startsAt))),
                joined: lastRain.done,
                members: lastRain.gardeners,
              }
            : null,
          status: rainStatus,
        },
      }}
      gardeners={{
        rows: roster.map((member) => {
          const name = gardenerName(member);
          const avatar = gardenerAvatar(member);
          const isYou = member.user_id === me.data?.id;
          return {
            id: member.user_id,
            name,
            initial: avatar.text,
            tone: avatar.tone,
            isYou,
            joined: t('joined', { date: f.shortDay(todayIn(timeZone, new Date(member.joined_at))) }),
            role: member.role,
            locked: isYou && member.role === 'ADMIN' && adminCount <= 1,
            onChange: (next: GroupRole | 'remove') => changeRole(member.user_id, name, next),
          };
        }),
        invites: { count: live.length, detail: live[0] ? inviteDetail(live[0]) : null },
        onInvites: () => setLinksOpen(true),
        invite: { onClick: () => setInviteOpen(true) },
        footer: (
          <div className="mx-4 flex flex-col gap-2">
            {status ? (
              <p role="status" className="px-1 text-[13px] text-muted-foreground">
                {status}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex h-12 items-center justify-center rounded-control border border-border bg-surface text-[14px] font-bold text-forest"
            >
              {t('settings')}
            </button>
          </div>
        ),
      }}
    >
      <InviteSheetLive
        groupId={groupId}
        groupName={group.name}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
      <InviteLinksSheet
        groupId={groupId}
        open={linksOpen}
        onOpenChange={setLinksOpen}
        invites={live}
        detail={inviteDetail}
        onNew={() => {
          setLinksOpen(false);
          setInviteOpen(true);
        }}
      />
      <SettingsSheet
        groupId={groupId}
        initial={{ name: group.name, about: group.description ?? '', open: group.is_public }}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </TendGardenScreen>
  );
}

function InviteLinksSheet({
  groupId,
  open,
  onOpenChange,
  invites,
  detail,
  onNew,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invites: readonly GroupInviteSummary[];
  detail: (invite: GroupInviteSummary) => string;
  onNew: () => void;
}) {
  const t = useTranslations('screens.groups.tend');
  const roles = useTranslations('components.groups.roles');
  const revoke = useRevokeInvite(groupId);
  return (
    <GroupSheet open={open} onOpenChange={onOpenChange} title={t('linksTitle')} subtitle={t('linksSubtitle')}>
      {invites.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{t('invitesNone')}</p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface">
          {invites.map((invite, index) => (
            <li
              key={invite.id}
              className={
                index < invites.length - 1
                  ? 'flex items-center gap-3 border-b border-divider px-[14px] py-2.5'
                  : 'flex items-center gap-3 px-[14px] py-2.5'
              }
            >
              <span className="flex-grow text-[13px]">{detail(invite)}</span>
              <button
                type="button"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(invite.id)}
                aria-label={t('revokeLabel', { role: roles(invite.grant_role) })}
                className="h-9 shrink-0 rounded-[12px] border border-border px-3 text-[13px] font-bold text-primary-text"
              >
                {t('revoke')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onNew}
        className="flex h-[54px] items-center justify-center rounded-control bg-forest text-[16px] font-bold text-white shadow-press-forest"
      >
        {t('newLink')}
      </button>
    </GroupSheet>
  );
}

function SettingsSheet({
  groupId,
  initial,
  open,
  onOpenChange,
}: {
  groupId: string;
  initial: { name: string; about: string; open: boolean };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('screens.groups.tend');
  const c = useTranslations('screens.groups.create');
  const router = useRouter();
  const update = useUpdateGroup(groupId);
  const remove = useDeleteGroup();
  const [name, setName] = React.useState(initial.name);
  const [about, setAbout] = React.useState(initial.about);
  const [isPublic, setIsPublic] = React.useState(initial.open);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(initial.name);
      setAbout(initial.about);
      setIsPublic(initial.open);
      setMessage(null);
    }
  }, [open, initial.name, initial.about, initial.open]);

  return (
    <GroupSheet open={open} onOpenChange={onOpenChange} title={t('settings')} subtitle={t('settingsSubtitle')}>
      <CreateGardenBody
        name={name}
        about={about}
        open={isPublic}
        onNameChange={setName}
        onAboutChange={setAbout}
        onOpenChange={setIsPublic}
        aboutPlaceholder={c('aboutPlaceholder')}
        submitLabel={t('save')}
        busy={update.isPending || remove.isPending}
        error={message}
        onSubmit={() =>
          update.mutate(
            { name: name.trim(), description: about.trim(), isPublic },
            {
              onSuccess: () => onOpenChange(false),
              onError: () => setMessage(t('actionFailed')),
            },
          )
        }
        footer={
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(t('deleteConfirm', { name: initial.name }))) return;
              remove.mutate(groupId, {
                onSuccess: () => router.push(GARDEN_ROUTES.groups),
                onError: () => setMessage(t('actionFailed')),
              });
            }}
            className="h-11 text-[15px] font-semibold text-primary-text underline"
          >
            {t('delete')}
          </button>
        }
      />
    </GroupSheet>
  );
}
