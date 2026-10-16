'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useNotificationSchedules } from '@/hooks/useNotificationSchedules';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useUpsertSchedule } from '@/hooks/useUpsertSchedule';
import { pushBlocker, type PushBlocker } from '@/lib/push';

import { parseClock, type ClockTime } from '../format';
import { OnboardReminderScreen } from '../screens/OnboardReminderScreen';
import { earliestSchedule, localTimezone } from './data';
import {
  clockToHhmm,
  DEFAULT_REMINDER,
  REMINDER_CHOICES,
  reminderChoiceAt,
  type ReminderChoice,
} from './onboarding';

/**
 * /welcome/reminder: OB4 Reminder. The same reminder as A3 / A8 (the
 * learner's earliest schedule, POST /notifications/schedules upsert, with
 * the detected time zone). Starts on the saved choice, else Morning.
 *
 * "Remind me at …" asks the browser for notifications (only after that tap)
 * through the same Web Push subscribe as useReminderSwitch, and saves the
 * time switched on only once the subscription reached the server; if it
 * was refused, failed or isn't supported the reminder is saved off, so OB5
 * shows it honestly (Profile can turn it on later). When this browser
 * can't get reminders (iPhone outside the home-screen app, no Web Push,
 * notifications blocked) the screen says why. "Not now" saves it off.
 * Both open OB5.
 */
export function OnboardReminderLive() {
  const router = useRouter();
  const schedules = useNotificationSchedules();
  const upsert = useUpsertSchedule();
  const push = usePushSubscription();
  const existing = earliestSchedule(schedules.data);
  const [picked, setPicked] = React.useState<ReminderChoice | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [blocked, setBlocked] = React.useState<PushBlocker | null>(null);
  React.useEffect(() => {
    if (push.checked) setBlocked(pushBlocker());
  }, [push.checked, push.state]);
  const choice =
    picked ?? (existing ? reminderChoiceAt(parseClock(existing.reminder_time)) : null) ?? DEFAULT_REMINDER;
  const time = REMINDER_CHOICES.find((item) => item.id === choice)!.time;
  const next = () => router.push(GARDEN_ROUTES.welcome.ready);

  const save = (at: ClockTime, isEnabled: boolean) =>
    upsert.mutateAsync({ reminderTime: clockToHhmm(at), timezone: localTimezone(), isEnabled });

  async function run(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch {
      // The reminder can be set later in Profile; onboarding never stops here.
    } finally {
      setBusy(false);
      next();
    }
  }

  const remind = () =>
    run(async () => {
      const ok = await push.subscribe();
      await save(time, ok);
    });

  return (
    <OnboardReminderScreen
      choice={choice}
      onChoiceChange={setPicked}
      onConfirm={() => void remind()}
      onNotNow={() => void run(() => save(time, false).then(() => undefined))}
      back={GARDEN_ROUTES.welcome.level}
      saving={busy}
      blocked={blocked}
    />
  );
}
