'use client';

import * as React from 'react';

import { useTranslations } from 'next-intl';

import { AccountSheet } from '@/components/garden/AccountSheet';
import { GardenSidebarList, GardenSidebarStreak } from '@/components/garden/GardenSidebarList';
import { GroupsTabProvider } from '@/components/garden/groupsTab';
import type { CalendarLevel } from '@/components/garden/GardenCalendar';
import { DailyGoalScreen, type GoalMinutes } from '@/components/garden/screens/DailyGoalScreen';
import { MeScreen } from '@/components/garden/screens/MeScreen';
import { MeaningsScreen, type MeaningChoice } from '@/components/garden/screens/MeaningsScreen';
import { ReminderScreen } from '@/components/garden/screens/ReminderScreen';
import type { ReminderChannel } from '@/types';

/** The boards' sample data and states (source/Adult*.dc.html, iPadMe.dc.html). */
export function ProfileGallery({ screen, vi }: { screen: string; vi: boolean }) {
  if (screen.startsWith('A8b-daily-goal'))
    return <GoalBoard intense={screen.endsWith('-intense')} />;
  if (screen.startsWith('A8d-meanings')) return <MeaningsBoard state={screen.slice(12)} vi={vi} />;
  if (screen.startsWith('iA8-me'))
    return <IpadMeBoard account={screen === 'iA8-me-account'} vi={vi} />;
  if (screen.startsWith('A8c-reminder')) return <ReminderBoard state={screen.slice(12)} />;
  return <p>Unknown board {screen}</p>;
}

function ReminderBoard({ state }: { state: string }) {
  const [on, setOn] = React.useState(state !== '-off');
  const [minutes, setMinutes] = React.useState(state === '-evening' ? 21 * 60 : 7 * 60 + 30);
  const [smart, setSmart] = React.useState(state === '-smart');
  const [days, setDays] = React.useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [channels, setChannels] = React.useState<ReminderChannel[]>(['push']);
  return (
    <ReminderScreen
      framed
      backHref="#"
      on={on}
      minutes={minutes}
      smart={smart}
      days={days}
      channels={channels}
      onToggle={setOn}
      onTime={(m) => {
        setMinutes(m);
        setSmart(false);
      }}
      onSmart={setSmart}
      onDays={setDays}
      onChannel={(c, next) =>
        setChannels(next ? [...channels, c] : channels.filter((x) => x !== c))
      }
    />
  );
}

function GoalBoard({ intense }: { intense: boolean }) {
  const [minutes, setMinutes] = React.useState<GoalMinutes>(intense ? 15 : 10);
  return (
    <DailyGoalScreen framed backHref="#" minutes={minutes} onPick={setMinutes} onSave={() => {}} />
  );
}

/**
 * A8d: the EN board starts on English only, the VI board on Tiếng Việt;
 * the reference names say the rest (-vi-recall, -vi-shown, -zh-recall, -en).
 * On the VI board the plain name is Tiếng Việt and `-vi-shown` its recall off.
 */
function MeaningsBoard({ state, vi }: { state: string; vi: boolean }) {
  const start: MeaningChoice = state.startsWith('-zh')
    ? 'zh-CN'
    : state.startsWith('-en')
      ? 'none'
      : state.startsWith('-vi') || vi
        ? 'vi-VN'
        : 'none';
  const [meaning, setMeaning] = React.useState<MeaningChoice>(start);
  const [recall, setRecall] = React.useState(!state.includes('shown'));
  return (
    <MeaningsScreen
      framed
      backHref="#"
      meaning={meaning}
      recallFirst={recall}
      onMeaning={setMeaning}
      onRecallFirst={setRecall}
      onSave={() => {}}
    />
  );
}

/** iPadMe.dc.html's calendar: a fixed pattern, livelier in the last weeks, the week's last two days still to come. */
function boardCalendar(): (CalendarLevel | null)[][] {
  return Array.from({ length: 16 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      if (w === 15 && d > 4) return null;
      const v = ((w * 7 + d) * 37 + w * 13) % 10;
      let level: CalendarLevel = v < 2 ? 0 : v < 4 ? 1 : v < 7 ? 2 : 3;
      if (w >= 12 && level < 2) level = 2;
      return level;
    }),
  );
}

function IpadMeBoard({ account, vi }: { account: boolean; vi: boolean }) {
  const t = useTranslations('components.tabBar');
  const [open, setOpen] = React.useState(account);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  return (
    <GroupsTabProvider value>
      <MeScreen
        name="Minh"
        goal={{ exam: 'IELTS Academic', band: 7 }}
        testDay="unset"
        stats={{ fruiting: 412, bestStreak: 41, hours: 38, goldenBlooms: 26 }}
        calendar={boardCalendar()}
        keepsakes={[
          { type: 'firstHarvest' },
          { type: 'streak', days: 30 },
          { type: 'blooms', count: 25 },
          { type: 'nextWords', current: 412, target: 500 },
        ]}
        dailyGoal={{ missions: 3, minutes: 15, href: '#' }}
        reminder={{ time: { hour: 7, minute: 30 }, on: true }}
        reminderHref="#"
        meanings={vi ? 'vi-VN' : 'none'}
        meaningsHref="#"
        family={{ name: 'Na', href: '#' }}
        onAccountClick={(gear) => {
          setAnchor(gear);
          setOpen(true);
        }}
        sidebar={
          <GardenSidebarList
            heading
            label={t('sharedGardens')}
            items={[
              {
                id: 'g1',
                href: '#',
                label: 'IELTS Sprint',
                avatar: 'I',
                badge: '5',
              },
            ]}
          />
        }
        sidebarFooter={
          <GardenSidebarStreak
            title={t('streak', { count: 23 })}
            detail={t('barrel', { count: 2 })}
          />
        }
        stickyNav={false}
      />
      <AccountSheet
        open={open}
        onOpenChange={setOpen}
        name="Minh"
        email="minh@example.com"
        onSignOut={() => {}}
        anchor={anchor}
      />
    </GroupsTabProvider>
  );
}
