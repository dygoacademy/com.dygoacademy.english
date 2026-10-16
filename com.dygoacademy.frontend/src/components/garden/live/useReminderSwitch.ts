'use client';

import * as React from 'react';

import { useNotificationSchedules } from '@/hooks/useNotificationSchedules';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useUpsertSchedule } from '@/hooks/useUpsertSchedule';
import { pushBlocker, type PushBlocker } from '@/lib/push';

import { DEFAULT_REMINDER_TIME, earliestSchedule, localTimezone } from './data';

/**
 * The garden's reminder switch (A3 Mission complete, A8 Me): the learner's
 * earliest schedule (GET /notifications/schedules) and a `change(on)` that
 * upserts it (POST /notifications/schedules, same time and zone). With no
 * schedule yet, turning it on creates one at DEFAULT_REMINDER_TIME in the
 * browser's zone.
 *
 * `on` is honest about this device (2026-10-16, "reminders say on but never
 * arrive"): it is true only when the schedule is enabled AND this browser
 * has a push subscription the server knows about. Turning it on saves the
 * schedule only after the subscription reached the server; a refused
 * prompt or a failed subscribe leaves it off. While the schedule is on and
 * this browser is subscribed, the subscription is re-saved once per visit,
 * which repairs a server row that was pruned or taken by another account.
 *
 * `blocked` says why this browser can't get reminders (iPhone outside the
 * home-screen app, no Web Push, or notifications blocked); `supported` is
 * false only when the browser has no Web Push at all. `key` changes
 * whenever the screen's switch should restart from the real state.
 */
export function useReminderSwitch() {
  const schedules = useNotificationSchedules();
  const upsert = useUpsertSchedule();
  const push = usePushSubscription();
  const [refused, setRefused] = React.useState(0);
  const [blocked, setBlocked] = React.useState<PushBlocker | null>(null);
  const schedule = earliestSchedule(schedules.data);
  const enabled = schedule?.is_enabled ?? false;
  const subscribed = push.state === 'subscribed';
  const on = enabled && (!push.checked || subscribed);

  React.useEffect(() => {
    if (push.checked) setBlocked(pushBlocker());
  }, [push.checked, push.state]);

  const { subscribe } = push;
  const resynced = React.useRef(false);
  React.useEffect(() => {
    if (!enabled || !subscribed || resynced.current) return;
    resynced.current = true;
    void subscribe();
  }, [enabled, subscribed, subscribe]);

  const change = React.useCallback(
    async (next: boolean) => {
      if (!next && !schedule) return;
      if (next && !(await subscribe())) {
        setBlocked(pushBlocker());
        setRefused((n) => n + 1);
        return;
      }
      upsert.mutate({
        reminderTime: schedule?.reminder_time ?? DEFAULT_REMINDER_TIME,
        timezone: schedule?.timezone ?? localTimezone(),
        isEnabled: next,
      });
    },
    [schedule, subscribe, upsert],
  );

  return {
    schedules: schedules.data,
    schedule,
    on,
    blocked,
    supported: push.state !== 'unsupported',
    change,
    key: `${schedule ? `${schedule.id}-${schedule.is_enabled}` : 'none'}-${on}-${refused}`,
  };
}
