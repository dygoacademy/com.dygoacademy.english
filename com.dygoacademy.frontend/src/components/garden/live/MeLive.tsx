"use client";

import * as React from "react";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useWeekMissions } from "@/hooks/useMissions";
import { useMyKeepsakes, useMyProfile } from "@/hooks/useProfile";
import { useSrsStats } from "@/hooks/useSrsStats";
import { useVoiceDonation } from "@/hooks/useVoiceDonation";
import { GARDEN_ROUTES } from "@/constants/garden";
import { isVoiceDonationOn } from "@/lib/voice-donation";

import { parseClock } from "../format";
import { useGardenPreferences } from "../preferences";
import { MeScreen } from "../screens/MeScreen";
import { AccountSheetLive } from "./AccountSheetLive";
import { SharedGardensSidebar, StreakSidebarCard } from "./SidebarLists";
import {
  DEFAULT_REMINDER_TIME,
  displayName,
  gardenHours,
  meCalendar,
  meKeepsakes,
  missionsForGoal,
} from "./data";
import { useReminderSwitch } from "./useReminderSwitch";

/**
 * /me: Me (A8).
 *
 * Real: the name (profiles.display_name, else Supabase user metadata, else
 * the email), mastered words as "words fruiting" (GET /srs/stats), and the reminder: the
 * learner's first Web Push schedule (GET /notifications/schedules), which
 * the switch turns on and off through the existing upsert (same time and
 * zone; U6-7b: shared with A3 via useReminderSwitch, which also makes sure
 * Web Push is subscribed when it turns on). UI-6 U6-7: best streak (`best_streak_days`, GET /srs/stats),
 * Golden Blooms and keepsakes (GET /me/keepsakes), the calendar (missions
 * per day, GET /missions/week), the daily goal row (A8b: opens /me/goal,
 * which saves `daily_goal_minutes`, PATCH /profiles/me). Time in the
 * garden is `garden_minutes` (GET /srs/stats), shown in hours ("—" from an
 * older backend); family stays hidden. UI-L: "Meanings in" shows the profile's
 * meaning language; A8d: it opens /me/meanings.
 * A8f: "Language & accent" shows the app language and US/UK English
 * (`english_variety`) and opens /me/language.
 * SO-1: the gear opens the Account sheet (who's signed in, Sign out).
 * iA8 (iPad nav, landscape): the sidebar lists the shared gardens and the
 * streak card (current streak, rain barrels left); the gear's Account
 * sheet hangs under it as a popover.
 * Voice donation (NEXT_PUBLIC_VOICE_DONATION): the "Privacy & data" row,
 * on/off from GET /profiles/me/voice-donation (off until it loads).
 */
export function MeLive() {
  const preferences = useGardenPreferences();
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [accountAnchor, setAccountAnchor] = React.useState<HTMLElement | null>(
    null,
  );
  const user = useCurrentUser();
  const stats = useSrsStats();
  const reminder = useReminderSwitch();
  const week = useWeekMissions();
  const keepsakes = useMyKeepsakes();
  const profile = useMyProfile();
  const donation = useVoiceDonation();
  const goalMinutes = profile.data?.daily_goal_minutes ?? null;

  const email = user.data?.email ?? "";
  const name =
    displayName(user.data, stats.data?.display_name) ??
    (email ? email.split("@")[0] : "");
  const schedule = reminder.schedule;

  return (
    <>
      <MeScreen
        // Remount when the schedule loads so the switch starts in its real state.
        key={reminder.key}
        name={name}
        goal={null}
        testDay={null}
        stats={{
          fruiting: stats.data?.mastered_words ?? null,
          bestStreak: stats.data?.best_streak_days ?? null,
          hours: gardenHours(stats.data?.garden_minutes),
          goldenBlooms: keepsakes.data?.golden_blooms ?? null,
        }}
        calendar={week.data ? meCalendar(week.data, new Date()) : null}
        keepsakes={keepsakes.data ? meKeepsakes(keepsakes.data) : null}
        dailyGoal={
          goalMinutes === null
            ? null
            : {
                missions: missionsForGoal(goalMinutes),
                minutes: goalMinutes,
                href: GARDEN_ROUTES.goal,
              }
        }
        // Always shown, so a learner who skipped it in onboarding can turn it on.
        reminder={
          reminder.schedules
            ? {
                time: parseClock(
                  schedule?.reminder_time ?? DEFAULT_REMINDER_TIME,
                ),
                on: reminder.on,
                blocked: reminder.blocked,
              }
            : null
        }
        onReminderChange={(on) => void reminder.change(on)}
        reminderHref={GARDEN_ROUTES.reminder}
        meanings={preferences.meaningLocale ?? "none"}
        meaningsHref={GARDEN_ROUTES.meanings}
        language={{
          appLocale: preferences.appLocale,
          variety: profile.data?.english_variety ?? "en-US",
          href: GARDEN_ROUTES.language,
        }}
        family={null}
        privacy={
          isVoiceDonationOn()
            ? {
                donating: donation.data?.donating ?? false,
                href: GARDEN_ROUTES.privacy,
              }
            : null
        }
        onAccountClick={(gear) => {
          setAccountAnchor(gear);
          setAccountOpen(true);
        }}
        sidebar={<SharedGardensSidebar heading />}
        sidebarFooter={<StreakSidebarCard />}
      />
      <AccountSheetLive
        open={accountOpen}
        onOpenChange={setAccountOpen}
        name={name}
        email={email}
        anchor={accountAnchor}
      />
    </>
  );
}
