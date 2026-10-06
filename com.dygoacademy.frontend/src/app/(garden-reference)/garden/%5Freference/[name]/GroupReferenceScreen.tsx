'use client';

import { useTranslations } from 'next-intl';

import { useGardenFormat } from '@/components/garden/format';
import { GroupGardenScreen } from '@/components/garden/screens/GroupGardenScreen';
import {
  CreateGardenSheetScreen,
  InviteSheetScreen,
} from '@/components/garden/screens/GroupSheetScreens';
import { ENTRY } from '@/components/garden/screens/fixtures';
import { groupFixtures, type GroupReferenceName } from '@/components/garden/screens/groupFixtures';
import { JoinGardenScreen } from '@/components/garden/screens/JoinGardenScreen';
import { SharedGardensScreen } from '@/components/garden/screens/SharedGardensScreen';
import { TendGardenScreen } from '@/components/garden/screens/TendGardenScreen';
import { GARDEN_ROUTES } from '@/constants/garden';
import type { AppLocale } from '@/i18n/config';

/**
 * The group screens (UI-G, GR1–GR7) on the reference pages, with the
 * canvas sample data in the page's language. Links go to other reference
 * pages, like the canvas's own links.
 */
export function GroupReferenceScreen({
  name,
  locale,
}: {
  name: GroupReferenceName;
  locale: AppLocale;
}) {
  const f = useGardenFormat();
  const list = useTranslations('screens.groups.list');
  const tend = useTranslations('screens.groups.tend');
  const roles = useTranslations('components.groups.roles');
  const fx = groupFixtures(locale);
  const ref = GARDEN_ROUTES.reference;

  switch (name) {
    case 'GR1-shared-gardens':
      return (
        <SharedGardensScreen
          gardens={fx.list.gardens.map((garden) => ({
            id: garden.id,
            href: ref('GR2-group-garden'),
            name: garden.name,
            role: garden.role,
            meta: list('cardMeta', { members: garden.members, beds: garden.beds, words: garden.words }),
            plant: garden.plant,
            avatars: garden.avatars,
            due: garden.due,
          }))}
          gardeners={fx.list.gardeners}
          rainDay={{
            ...fx.list.rainDay,
            ends: f.clock(fx.list.rainDay.ends),
            href: GARDEN_ROUTES.review,
          }}
          start={{ href: ref('GR7-create') }}
          join={{ href: ref('GR6-join') }}
          stickyNav={false}
        />
      );
    case 'GR2-group-garden':
      return (
        <GroupGardenScreen
          name={fx.garden.name}
          role={fx.garden.role}
          members={fx.garden.members}
          backHref={ref('GR1-shared-gardens')}
          manageHref={ref('GR3-tricky-patches')}
          hero={fx.garden.hero}
          rainDay={{ ...fx.garden.rainDay, href: GARDEN_ROUTES.review }}
          beds={fx.garden.beds.map((bed) => ({ ...bed, href: ref('A7-topic-bed') }))}
          avatars={fx.garden.avatars}
          invite={{ href: ref('GR5-invite') }}
          stickyNav={false}
        />
      );
    case 'GR3-tricky-patches':
    case 'SE6-entry-echo':
    case 'GR4-gardeners':
      return (
        <TendGardenScreen
          tab={name === 'GR4-gardeners' ? 'gardeners' : 'tricky'}
          groupName={fx.garden.name}
          backHref={ref('GR2-group-garden')}
          trickyHref={ref('GR3-tricky-patches')}
          gardenersHref={ref('GR4-gardeners')}
          tricky={{
            rows: fx.tricky.rows,
            echo:
              name === 'SE6-entry-echo'
                ? { ...ENTRY.echo, href: ref('GR3-tricky-patches') }
                : null,
            rainDay: {
              members: fx.tricky.members,
              size: fx.tricky.size,
              last: { day: f.weekday(fx.tricky.lastDay), joined: fx.tricky.lastJoined },
            },
          }}
          gardeners={{
            rows: fx.roster.map((member) => ({
              id: member.id,
              name: member.name,
              initial: member.avatar.text,
              tone: member.avatar.tone,
              isYou: member.isYou,
              joined: tend('joined', { date: f.shortDay(member.joined) }),
              role: member.role,
            })),
            invites: {
              count: fx.invites.count,
              detail: [
                roles(fx.invites.role),
                tend('inviteUses', { used: fx.invites.used, max: fx.invites.max }),
                tend('inviteExpires', { date: f.shortDay(fx.invites.expires) }),
              ].join(' · '),
            },
            invite: { href: ref('GR5-invite') },
          }}
          stickyNav={false}
        />
      );
    case 'GR5-invite':
      return (
        <InviteSheetScreen
          groupName={fx.garden.name}
          role={fx.invite.role}
          expiresDays={fx.invite.days}
          maxUses={fx.invite.uses}
          link={fx.invite.link}
          closeHref={ref('GR4-gardeners')}
        />
      );
    case 'GR6-join':
      return (
        <JoinGardenScreen
          groupName={fx.join.name}
          description={fx.join.description}
          inviter={fx.join.inviter}
          counts={fx.join.counts}
          role={fx.join.role}
          closeHref={ref('A1-todays-garden')}
          join={{ href: ref('GR2-group-garden') }}
          notNowHref={ref('A1-todays-garden')}
        />
      );
    case 'GR7-create':
      return (
        <CreateGardenSheetScreen
          name={fx.create.name}
          gardens={fx.list.gardens.length}
          gardeners={fx.list.gardeners}
          closeHref={ref('GR1-shared-gardens')}
        />
      );
  }
}
