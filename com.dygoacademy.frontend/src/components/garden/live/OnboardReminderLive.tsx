'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useNotificationSchedules } from '@/hooks/useNotificationSchedules';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useUpsertSchedule } from '@/hooks/useUpsertSchedule';

import { parseClock, type ClockTime } from '../format';
import {
  OnboardReminderScreen,
  type OnboardReminderScreenProps,
} from '../screens/OnboardReminderScreen';
import { earliestSchedule, localTimezone } from './data';
import { clockToHhmm } from './onboarding';

/**
 * /welcome/reminder: OB4. The same reminder as A3 / A8 (the learner's
 * earliest schedule, POST /notifications/schedules upsert) and the same Web
 * Push subscribe as useReminderSwitch, in a different order: the browser
 * is asked for notifications only when the learner presses "Remind me at
 * …", after choosing a time. Granted → the schedule is saved on. Refused
 * or no Web Push → the time is still saved, switched off (Me can turn it
 * on later), and a note says so; the button then just continues. Skip goes
 * to OB5 without touching anything.
 */
export function OnboardReminderLive() {
  const router = useRouter();
  const schedules = useNotificationSchedules();
  const upsert = useUpsertSchedule();
  const push = usePushSubscription();
  const existing = earliestSchedule(schedules.data);
  const [picked, setPicked] = React.useState<ClockTime | null>(null);
  const [notice, setNotice] = React.useState<OnboardReminderScreenProps['notice']>(null);
  const [busy, setBusy] = React.useState(false);
  const time = picked ?? (existing ? parseClock(existing.reminder_time) : null);
  const next = () => router.push(GARDEN_ROUTES.welcome.ready);

  async function confirm() {
    if (!time) return;
    if (notice) {
      next();
      return;
    }
    setBusy(true);
    try {
      if (push.state === 'unsupported') {
        await save(time, false);
        setNotice('unsupported');
        return;
      }
      if (push.state !== 'subscribed') await push.subscribe();
      const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      await save(time, granted);
      if (granted) next();
      else setNotice('denied');
    } catch {
      setNotice('error');
    } finally {
      setBusy(false);
    }
  }

  const save = (at: ClockTime, isEnabled: boolean) =>
    upsert.mutateAsync({ reminderTime: clockToHhmm(at), timezone: localTimezone(), isEnabled });

  return (
    <OnboardReminderScreen
      time={time}
      onTimeChange={(value) => {
        setPicked(value);
        setNotice(null);
      }}
      onConfirm={() => void confirm()}
      onSkip={next}
      back={GARDEN_ROUTES.welcome.bed}
      saving={busy}
      notice={notice}
    />
  );
}
