'use client';

import * as React from 'react';

import { useNotificationSchedules } from '@/hooks/useNotificationSchedules';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useUpsertSchedule } from '@/hooks/useUpsertSchedule';

import { DEFAULT_REMINDER_TIME, earliestSchedule, localTimezone } from './data';

/**
 * The garden's reminder switch (A3 Mission complete, A8 Me): the learner's
 * earliest schedule (GET /notifications/schedules) and a `change(on)` that
 * upserts it (POST /notifications/schedules, same time and zone). Turning
 * it on first makes sure this browser is subscribed to Web Push (permission
 * prompt + subscribe); a refused prompt leaves the schedule as it was. With
 * no schedule yet, turning it on creates one at DEFAULT_REMINDER_TIME in the
 * browser's zone. `supported` is false only when the browser has no Web
 * Push. `key` changes whenever the screen's switch should restart from the
 * real state (schedule loaded or saved, or a refused prompt).
 */
export function useReminderSwitch() {
  const schedules = useNotificationSchedules();
  const upsert = useUpsertSchedule();
  const push = usePushSubscription();
  const [refused, setRefused] = React.useState(0);
  const schedule = earliestSchedule(schedules.data);

  const change = React.useCallback(
    async (on: boolean) => {
      if (!on && !schedule) return;
      if (on && push.state !== 'subscribed') {
        await push.subscribe();
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
          setRefused((n) => n + 1);
          return;
        }
      }
      upsert.mutate({
        reminderTime: schedule?.reminder_time ?? DEFAULT_REMINDER_TIME,
        timezone: schedule?.timezone ?? localTimezone(),
        isEnabled: on,
      });
    },
    [schedule, push, upsert],
  );

  return {
    schedules: schedules.data,
    schedule,
    supported: push.state !== 'unsupported',
    change,
    key: `${schedule ? `${schedule.id}-${schedule.is_enabled}` : 'none'}-${refused}`,
  };
}
