'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { useGardenFormat } from '@/components/garden/format';
import { GardenerRow } from '@/components/garden/GardenerRow';
import { GroupCard } from '@/components/garden/GroupCard';
import { GroupSheet } from '@/components/garden/GroupSheet';
import { InviteSheetBody } from '@/components/garden/InviteSheet';
import { useGardenPreferences } from '@/components/garden/preferences';
import { RainDayBanner } from '@/components/garden/RainDayBanner';
import { RoleBadge } from '@/components/garden/RoleBadge';
import { groupFixtures } from '@/components/garden/screens/groupFixtures';
import { TrickyPatchRow } from '@/components/garden/TrickyPatchRow';
import { Button } from '@/components/garden/Button';
import { GARDEN_ROUTES } from '@/constants/garden';
import type { GroupRole } from '@/types';

/**
 * UI-G components on /garden/_gallery: GroupCard, RoleBadge,
 * RainDayBanner (both variants), TrickyPatchRow, GardenerRow and the
 * InviteSheet, with the canvas sample data in the page's language.
 */
function StateLabel({ children }: { children: React.ReactNode }) {
  return <p className="overline-label mb-2 mt-5 text-label text-muted-foreground">{children}</p>;
}

export function GroupsGallery() {
  const g = useTranslations('gallery.states');
  const list = useTranslations('screens.groups.list');
  const garden = useTranslations('screens.groups.garden');
  const tend = useTranslations('screens.groups.tend');
  const invite = useTranslations('screens.groups.invite');
  const f = useGardenFormat();
  const { appLocale } = useGardenPreferences();
  const fx = groupFixtures(appLocale);

  const [roles, setRoles] = React.useState<Record<string, GroupRole>>(() =>
    Object.fromEntries(fx.roster.map((member) => [member.id, member.role])),
  );
  const [open, setOpen] = React.useState(false);
  const [inviteRole, setInviteRole] = React.useState<GroupRole>('READ');

  const top = Math.max(...fx.tricky.rows.map((row) => row.misses));

  return (
    <>
      <StateLabel>{g('groupCards')}</StateLabel>
      <div className="flex flex-col gap-2">
        {fx.list.gardens.map((item) => (
          <GroupCard
            key={item.id}
            href={GARDEN_ROUTES.reference('GR2-group-garden')}
            name={item.name}
            role={item.role}
            meta={list('cardMeta', { members: item.members, beds: item.beds, words: item.words })}
            plant={item.plant}
            avatars={item.avatars}
            due={item.due}
          />
        ))}
      </div>

      <StateLabel>{g('roles')}</StateLabel>
      <div className="flex gap-2">
        <RoleBadge role="ADMIN" />
        <RoleBadge role="WRITE" />
        <RoleBadge role="READ" />
      </div>

      <StateLabel>{g('rainForest')}</StateLabel>
      <div className="-mx-4">
        <RainDayBanner
          variant="forest"
          title={list('rainTitle', { group: fx.list.rainDay.group, count: fx.list.rainDay.words })}
          detail={list('rainDetail', {
            done: fx.list.rainDay.done,
            members: fx.list.rainDay.members,
            time: f.clock(fx.list.rainDay.ends),
          })}
          waterHref={GARDEN_ROUTES.review}
        />
      </div>
      <StateLabel>{g('rainWater')}</StateLabel>
      <div className="-mx-4">
        <RainDayBanner
          variant="water"
          title={garden('rainTitle', { count: fx.garden.rainDay.words })}
          detail={garden('rainDetail', {
            done: fx.garden.rainDay.done,
            members: fx.garden.members,
            mine: fx.garden.rainDay.mine,
            count: fx.garden.rainDay.words,
          })}
          waterHref={GARDEN_ROUTES.review}
        />
      </div>

      <StateLabel>{g('tricky')}</StateLabel>
      <ul className="rounded-[22px] border border-border bg-surface px-4 py-1">
        {fx.tricky.rows.map((row) => (
          <TrickyPatchRow
            key={row.word}
            word={row.word}
            meta={tend('trickyMeta', { misses: row.misses, gardeners: row.gardeners })}
            share={(row.misses / top) * 100}
          />
        ))}
      </ul>

      <StateLabel>{g('gardeners')}</StateLabel>
      <ul className="flex flex-col overflow-hidden rounded-[22px] border border-border bg-surface">
        {fx.roster.map((member, index) => (
          <GardenerRow
            key={member.id}
            name={member.name}
            initial={member.avatar.text}
            tone={member.avatar.tone}
            isYou={member.isYou}
            joined={tend('joined', { date: f.shortDay(member.joined) })}
            role={roles[member.id]}
            onChange={(next) => {
              if (next !== 'remove') setRoles((prev) => ({ ...prev, [member.id]: next }));
            }}
            locked={member.isYou}
            last={index === fx.roster.length - 1}
          />
        ))}
      </ul>

      <StateLabel>{g('invite')}</StateLabel>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {invite('title')}
      </Button>
      <GroupSheet
        open={open}
        onOpenChange={setOpen}
        title={invite('title')}
        subtitle={invite('subtitle', { group: fx.garden.name })}
      >
        <InviteSheetBody
          role={inviteRole}
          onRoleChange={setInviteRole}
          expires={invite('inDays', { count: fx.invite.days })}
          uses={invite('times', { count: fx.invite.uses })}
          link={fx.invite.link}
        />
      </GroupSheet>
    </>
  );
}
