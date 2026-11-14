'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useUpsertSchedule, type UpsertScheduleInput } from '@/hooks/useUpsertSchedule';
import type { ReminderChannel } from '@/types';

import { ReminderScreen } from '../screens/ReminderScreen';
import { DEFAULT_REMINDER_TIME, localTimezone } from './data';
import { useReminderSwitch } from './useReminderSwitch';

/** A new reminder's days and channels, the same defaults as the backend. */
const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6];
const DEFAULT_CHANNELS: ReminderChannel[] = ['push'];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * /me/reminder: A8c Reminder.
 *
 * The learner's one schedule (GET /notifications/schedules; one row per
 * learner since 20261114_reminder_settings.sql). The main switch goes
 * through `useReminderSwitch` (A3 and A8 use it too), so turning it on
 * subscribes this browser to Web Push first. Time, Smart time, days and the
 * push channel each save at once with POST /notifications/schedules, which
 * upserts on the learner and keeps the other fields; the screen shows the
 * new value straight away and puts it back if the save fails.
 */
export function ReminderLive() {
  const tMe = useTranslations('screens.me');
  const reminder = useReminderSwitch();
  const upsert = useUpsertSchedule();
  const schedule = reminder.schedule;

  const saved = React.useMemo(
    () => ({
      minutes: toMinutes(schedule?.reminder_time ?? DEFAULT_REMINDER_TIME),
      smart: schedule?.smart ?? false,
      days: schedule?.days ?? DEFAULT_DAYS,
      channels: schedule?.channels ?? DEFAULT_CHANNELS,
    }),
    [schedule],
  );
  const [draft, setDraft] = React.useState(saved);
  React.useEffect(() => setDraft(saved), [saved]);
  const [error, setError] = React.useState(false);

  const save = (patch: Partial<typeof saved>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setError(false);
    const body: UpsertScheduleInput = {
      reminderTime: toHhmm(next.minutes),
      timezone: schedule?.timezone ?? localTimezone(),
      isEnabled: reminder.on,
      days: next.days,
      smart: next.smart,
      channels: next.channels,
    };
    upsert.mutate(body, {
      onError: () => {
        setDraft(saved);
        setError(true);
      },
    });
  };

  return (
    <ReminderScreen
      key={reminder.key}
      backHref={GARDEN_ROUTES.me}
      on={reminder.on}
      minutes={draft.minutes}
      smart={draft.smart}
      days={draft.days}
      channels={draft.channels}
      onToggle={(on) => {
        setError(false);
        void reminder.change(on);
      }}
      onTime={(minutes) => save({ minutes, smart: false })}
      onSmart={(smart) => save({ smart })}
      onDays={(days) => save({ days })}
      onChannel={(channel, on) =>
        save({
          channels: on
            ? [...new Set([...draft.channels, channel])]
            : draft.channels.filter((c) => c !== channel),
        })
      }
      blocked={reminder.blocked ? tMe(`reminderBlocked.${reminder.blocked}`) : null}
      busy={reminder.schedules === undefined}
      error={error}
    />
  );
}
