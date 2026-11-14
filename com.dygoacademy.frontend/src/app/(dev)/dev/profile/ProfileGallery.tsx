'use client';

import * as React from 'react';

import { DailyGoalScreen, type GoalMinutes } from '@/components/garden/screens/DailyGoalScreen';
import { ReminderScreen } from '@/components/garden/screens/ReminderScreen';
import type { ReminderChannel } from '@/types';

/** The boards' sample data and states (source/Adult*.dc.html, iPadMe.dc.html). */
export function ProfileGallery({ screen }: { screen: string }) {
  if (screen.startsWith('A8b-daily-goal')) return <GoalBoard intense={screen.endsWith('-intense')} />;
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
      onChannel={(c, next) => setChannels(next ? [...channels, c] : channels.filter((x) => x !== c))}
    />
  );
}

function GoalBoard({ intense }: { intense: boolean }) {
  const [minutes, setMinutes] = React.useState<GoalMinutes>(intense ? 15 : 10);
  return <DailyGoalScreen framed backHref="#" minutes={minutes} onPick={setMinutes} onSave={() => {}} />;
}
