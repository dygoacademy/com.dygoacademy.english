'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeleteSchedule } from '@/hooks/useDeleteSchedule';
import { useNotificationSchedules } from '@/hooks/useNotificationSchedules';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useUpsertSchedule } from '@/hooks/useUpsertSchedule';
import { ApiError } from '@/lib/api-client';

/** The browser's own IANA zone — same source `UpsertScheduleDto.timezone` expects, never asked of the user directly. */
function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Formats a saved `"HH:MM:SS"` schedule row as explicit 12-hour AM/PM
 * (Phase 2 FR-16.3 -- audit finding: the `<input type="time">` above and
 * the saved list below could visibly disagree on 12- vs 24-hour).
 *
 * Corrected 2026-09-20, live-verified against the actual deployed page:
 * this function's first version passed `Intl.DateTimeFormat(undefined,
 * ...)`, assuming the JS runtime's locale-default hour cycle would match
 * whatever the native `<input type="time">` renders. It doesn't -- on
 * this exact deployment the input showed "08:00 PM" (12-hour) while
 * `Intl.DateTimeFormat(undefined, ...)` on the same page rendered "21:27"
 * (24-hour): a browser's native time-input widget and the JS engine's
 * `Intl` locale defaults are two separate subsystems that don't have to
 * agree, and there's no reliable way from application code to read back
 * what format the native input actually chose. Forcing `hour12: true`
 * here instead guarantees the list is at least internally consistent and
 * unambiguous, even though it can no longer promise it will always match
 * the native input's own rendering in every browser/OS combination --
 * that would need replacing the native input with a custom picker,
 * out of scope for this fix.
 */
function formatReminderTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const reference = new Date();
  reference.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).format(
    reference,
  );
}

const PERMISSION_COPY: Record<string, string> = {
  unsupported: 'This browser does not support push notifications.',
  denied: 'Notifications are blocked for this site in your browser settings.',
  unsubscribed: 'Off — you will not get reminders on this device.',
  subscribed: 'On for this device.',
  default: 'Not set up on this device yet.',
};

/**
 * Module 6 settings screen (FR-6.1, FR-6.5). Two concerns kept visually
 * separate but functionally linked: the browser-level push permission
 * (`usePushSubscription`, one on/off per device) and the schedule list
 * (`study_schedules`, arbitrary reminder times) — a student can have
 * schedules configured with push still off, in which case
 * NotificationProcessor's tick finds nothing to send to
 * (PushDispatchService.sendToUser no-ops with zero subscriptions), which is
 * why the push toggle is presented first, above the schedule form.
 */
export function NotificationSettings() {
  const push = usePushSubscription();
  const schedulesQuery = useNotificationSchedules();
  const upsertSchedule = useUpsertSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [reminderTime, setReminderTime] = useState('20:00');
  const [formError, setFormError] = useState<string | null>(null);

  const addSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await upsertSchedule.mutateAsync({ reminderTime, timezone: localTimezone(), isEnabled: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save that reminder time.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Push notifications</CardTitle>
          <CardDescription>{PERMISSION_COPY[push.state]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {push.error && <p className="text-xs text-destructive">{push.error}</p>}
          {push.state === 'subscribed' ? (
            <Button variant="outline" disabled={push.isPending} onClick={() => void push.unsubscribe()}>
              {push.isPending ? 'Turning off…' : 'Turn off on this device'}
            </Button>
          ) : (
            <Button
              disabled={push.isPending || push.state === 'unsupported' || push.state === 'denied'}
              onClick={() => void push.subscribe()}
            >
              {push.isPending ? 'Turning on…' : 'Turn on for this device'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily reminder</CardTitle>
          {/* Trailing "(FR-6.3/6.4)" dropped 2026-09-19 (Phase 2 FR-15.3) --
              an internal requirement-id citation that had leaked into
              production copy. The sentence stands fine without it. */}
          <CardDescription>
            A nudge when cards are due — leech words and streak risk take priority over a plain reminder.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={addSchedule} className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-muted-foreground">Time ({localTimezone()})</span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="rounded-lg border px-3 py-2"
                aria-label="Reminder time"
              />
            </label>
            <Button type="submit" disabled={upsertSchedule.isPending}>
              {upsertSchedule.isPending ? 'Saving…' : 'Add'}
            </Button>
          </form>
          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <ul className="flex flex-col gap-2">
            {schedulesQuery.data?.length === 0 && (
              <li className="text-sm text-muted-foreground">No reminders set yet.</li>
            )}
            {schedulesQuery.data?.map((schedule) => (
              <li
                key={schedule.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>
                  {formatReminderTime(schedule.reminder_time)} · {schedule.timezone}
                  {!schedule.is_enabled && (
                    <span className="ml-2 text-xs text-muted-foreground">(disabled)</span>
                  )}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deleteSchedule.isPending}
                  onClick={() => deleteSchedule.mutate(schedule.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
