'use client';

import * as React from 'react';
import { useTimeZone, useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useGroupGarden } from '@/hooks/useGroupGarden';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { ApiError } from '@/lib/api-client';

import { GroupGardenScreen } from '../screens/GroupGardenScreen';
import { avatarRow, bedPlant, bedShares } from './groupData';
import { InviteSheetLive } from './InviteSheetLive';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden/groups/[id]: GR2 on GET /groups/:id/garden (UI-G: group totals
 * and your own beds, "today" in your time zone) and the roster for the
 * initials. Admins get the manage button (GR3/GR4) and Invite (GR5).
 * Beds open the topic bed (A7). No rain-day banner until rain days are
 * stored.
 */
export function GroupGardenLive({ groupId }: { groupId: string }) {
  const t = useTranslations('screens.groups.garden');
  const timeZone = useTimeZone();
  const garden = useGroupGarden(groupId, timeZone);
  const members = useGroupMembers(groupId);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  if (garden.isPending) return <LiveLoading />;
  if (garden.isError || !garden.data) {
    const missing = garden.error instanceof ApiError && garden.error.status === 404;
    return missing ? (
      <LiveError message={t('notFound')} />
    ) : (
      <LiveError onRetry={() => void garden.refetch()} />
    );
  }

  const data = garden.data;
  const admin = data.role === 'ADMIN';

  return (
    <GroupGardenScreen
      name={data.name}
      role={data.role}
      members={data.member_count}
      backHref={GARDEN_ROUTES.groups}
      manageHref={admin ? GARDEN_ROUTES.groupManage(groupId) : null}
      hero={{
        words: data.word_count,
        watered: data.watered_today,
        ripe: data.ripe_plants,
        plants: data.total_plants,
      }}
      rainDay={null}
      beds={data.beds.map((bed) => ({
        id: bed.topic_id,
        href: GARDEN_ROUTES.topic(bed.topic_id),
        title: bed.title,
        words: bed.word_count,
        level: null,
        plant: bedPlant(bed),
        due: bed.due_count,
        shares: bedShares(bed),
      }))}
      avatars={avatarRow(members.data ?? [], data.member_count, { withMore: true })}
      invite={admin ? { onClick: () => setInviteOpen(true) } : null}
    >
      {admin ? (
        <InviteSheetLive
          groupId={groupId}
          groupName={data.name}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      ) : null}
    </GroupGardenScreen>
  );
}
