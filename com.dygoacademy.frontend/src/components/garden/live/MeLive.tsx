"use client";

import * as React from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotificationSchedules } from "@/hooks/useNotificationSchedules";
import { useSrsStats } from "@/hooks/useSrsStats";
import { useUpsertSchedule } from "@/hooks/useUpsertSchedule";

import { parseClock } from "../format";
import { LanguageSheet } from "../LanguageSheet";
import { useGardenPreferences } from "../preferences";
import { MeScreen } from "../screens/MeScreen";
import { displayName } from "./data";
import { useLanguageSettings } from "./useLanguageSettings";

/**
 * /garden/me: Me (A8).
 *
 * Real: the name (Supabase profile metadata, else the email), mastered
 * words as "words fruiting" (GET /srs/stats), and the reminder: the
 * learner's first Web Push schedule (GET /notifications/schedules), which
 * the switch turns on and off through the existing upsert (same time and
 * zone). Not available yet (UI-6): best streak, time in the garden,
 * Golden Blooms, the missions calendar, keepsakes, daily goal and family,
 * shown as "—" or "coming soon". UI-L: "Meanings in" shows the profile's
 * meaning language and opens the language sheet (app + meaning language).
 */
export function MeLive() {
  const preferences = useGardenPreferences();
  const language = useLanguageSettings();
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const user = useCurrentUser();
  const stats = useSrsStats();
  const schedules = useNotificationSchedules();
  const upsert = useUpsertSchedule();

  const email = user.data?.email ?? "";
  const name = displayName(user.data) ?? (email ? email.split("@")[0] : "");
  const schedule = [...(schedules.data ?? [])].sort((a, b) =>
    a.reminder_time.localeCompare(b.reminder_time),
  )[0];

  return (
    <>
      <MeScreen
        // Remount when the schedule loads so the switch starts in its real state.
        key={schedule ? `${schedule.id}-${schedule.is_enabled}` : "none"}
        name={name}
        goal={null}
        testDay={null}
        stats={{
          fruiting: stats.data?.mastered_words ?? null,
          bestStreak: null,
          hours: null,
          goldenBlooms: null,
        }}
        calendar={null}
        keepsakes={null}
        dailyGoal={null}
        reminder={
          schedule
            ? {
                time: parseClock(schedule.reminder_time),
                on: schedule.is_enabled,
              }
            : null
        }
        onReminderChange={(on) => {
          if (!schedule) return;
          upsert.mutate({
            reminderTime: schedule.reminder_time,
            timezone: schedule.timezone,
            isEnabled: on,
          });
        }}
        meanings={preferences.meaningLocale ?? "none"}
        onLanguageClick={() => setLanguageOpen(true)}
        family={null}
      />
      <LanguageSheet
        open={languageOpen}
        onOpenChange={setLanguageOpen}
        uiLocale={language.uiLocale}
        meaningLocale={language.meaningLocale}
        onChange={(next) => void language.change(next)}
        saving={language.saving}
        error={language.error}
      />
    </>
  );
}
