"use client";

import * as React from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useWeekMissions } from "@/hooks/useMissions";
import {
  useMyKeepsakes,
  useMyProfile,
  useUpdateProfilePrefs,
} from "@/hooks/useProfile";
import { useNotificationSchedules } from "@/hooks/useNotificationSchedules";
import { useSrsStats } from "@/hooks/useSrsStats";
import { useUpsertSchedule } from "@/hooks/useUpsertSchedule";

import { DailyGoalSheet } from "../DailyGoalSheet";
import { parseClock } from "../format";
import { LanguageSheet } from "../LanguageSheet";
import { useGardenPreferences } from "../preferences";
import { MeScreen } from "../screens/MeScreen";
import { AccountSheetLive } from "./AccountSheetLive";
import { displayName, meCalendar, meKeepsakes } from "./data";
import { useLanguageSettings } from "./useLanguageSettings";

/**
 * /garden/me: Me (A8).
 *
 * Real: the name (Supabase profile metadata, else the email), mastered
 * words as "words fruiting" (GET /srs/stats), and the reminder: the
 * learner's first Web Push schedule (GET /notifications/schedules), which
 * the switch turns on and off through the existing upsert (same time and
 * zone). UI-6 U6-7: best streak (`best_streak_days`, GET /srs/stats),
 * Golden Blooms and keepsakes (GET /me/keepsakes), the calendar (missions
 * per day, GET /missions/week), the daily goal row (opens DailyGoalSheet,
 * saves `daily_goal_minutes`) and UK/US English in the language sheet
 * (saves `english_variety`), both via PATCH /profiles/me. Still not
 * available: time in the garden ("—"); family stays hidden. UI-L: "Meanings in" shows the profile's
 * meaning language and opens the language sheet (app + meaning language).
 * SO-1: the gear opens the Account sheet (who's signed in, Sign out).
 */
export function MeLive() {
  const preferences = useGardenPreferences();
  const language = useLanguageSettings();
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const user = useCurrentUser();
  const stats = useSrsStats();
  const schedules = useNotificationSchedules();
  const upsert = useUpsertSchedule();
  const week = useWeekMissions();
  const keepsakes = useMyKeepsakes();
  const profile = useMyProfile();
  const prefs = useUpdateProfilePrefs();
  const [goalOpen, setGoalOpen] = React.useState(false);
  // Optimistic: show the value being saved until the reply lands.
  const pending = prefs.isPending ? prefs.variables : undefined;
  const goalMinutes =
    pending?.dailyGoalMinutes ?? profile.data?.daily_goal_minutes ?? null;
  const variety =
    pending?.englishVariety ?? profile.data?.english_variety ?? undefined;
  const lastPref = prefs.variables;

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
          bestStreak: stats.data?.best_streak_days ?? null,
          hours: null,
          goldenBlooms: keepsakes.data?.golden_blooms ?? null,
        }}
        calendar={week.data ? meCalendar(week.data, new Date()) : null}
        keepsakes={keepsakes.data ? meKeepsakes(keepsakes.data) : null}
        dailyGoal={
          goalMinutes === null ? null : { missions: 3, minutes: goalMinutes }
        }
        onDailyGoalClick={() => setGoalOpen(true)}
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
        onAccountClick={() => setAccountOpen(true)}
      />
      <AccountSheetLive
        open={accountOpen}
        onOpenChange={setAccountOpen}
        name={name}
        email={email}
      />
      <LanguageSheet
        open={languageOpen}
        onOpenChange={setLanguageOpen}
        uiLocale={language.uiLocale}
        meaningLocale={language.meaningLocale}
        englishVariety={variety}
        onChange={({ englishVariety, ...next }) => {
          if (englishVariety) prefs.mutate({ englishVariety });
          if (next.uiLocale !== undefined || next.meaningLocale !== undefined)
            void language.change(next);
        }}
        saving={language.saving || prefs.isPending}
        error={
          language.error ||
          (prefs.isError && lastPref?.englishVariety !== undefined)
        }
      />
      {goalMinutes !== null ? (
        <DailyGoalSheet
          open={goalOpen}
          onOpenChange={setGoalOpen}
          minutes={goalMinutes}
          onChange={(minutes) => prefs.mutate({ dailyGoalMinutes: minutes })}
          saving={prefs.isPending}
          error={prefs.isError && lastPref?.dailyGoalMinutes !== undefined}
        />
      ) : null}
    </>
  );
}
