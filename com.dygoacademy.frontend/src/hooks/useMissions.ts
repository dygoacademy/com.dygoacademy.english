'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { getResolvedTimezone } from '@/lib/timezone';

/**
 * UI-6 daily mission types (backend `modules/missions/missions.store.ts`).
 * SPEAK (Phase 13 SE1) takes QUIZ's place as the 3rd mission on alternate days;
 * since daily goal missions (2026-10-15) a day has 2 to 4 of them.
 */
export type MissionType = 'REVIEW_DUE' | 'LEARN_NEW' | 'QUIZ' | 'SPEAK';

export interface DailyMission {
  type: MissionType;
  target: number;
  progress: number;
  done: boolean;
}

/** `GET /missions/today`. */
export interface TodayMissions {
  /** The learner's local date, YYYY-MM-DD. */
  date: string;
  missions: DailyMission[];
  /** Every mission of today done (2 to 4 a day, from the daily goal). */
  goldenBloom: boolean;
  /** Questions in today's QUIZ mission (daily goal tier); absent on older backends. */
  quiz_questions?: number;
  /** About how long today's missions take, in minutes; absent on older backends. */
  estimate_minutes?: number;
}

/** One row of `GET /missions/week` (oldest first, today last). */
export interface MissionDay {
  date: string;
  /** Missions completed that local day (0–4). */
  done: number;
  goldenBloom: boolean;
}

/*
 * The query keys sit under ['srs', ...] on purpose: a rated card
 * (useRateWord) and a finished quiz (useSubmitQuizAnswer) already
 * invalidate ['srs'], and both are what move mission progress (U6-2).
 */

/** `GET /api/v1/missions/today` — today's 3 missions (U6-2), in the learner's time zone. */
export function useTodayMissions(timezone: string = getResolvedTimezone()) {
  return useQuery({
    queryKey: ['srs', 'missions', 'today', timezone],
    queryFn: () =>
      apiClient.get<TodayMissions>(`/missions/today?tz=${encodeURIComponent(timezone)}`),
  });
}

/** `GET /api/v1/missions/week` — the trailing 7 local days (U6-2). */
export function useWeekMissions(timezone: string = getResolvedTimezone()) {
  return useQuery({
    queryKey: ['srs', 'missions', 'week', timezone],
    queryFn: () => apiClient.get<MissionDay[]>(`/missions/week?tz=${encodeURIComponent(timezone)}`),
  });
}

/** A4 This week: one weekly mission (backend `missions/weekly.store.ts`). */
export type WeeklyMissionKey = 'rescue' | 'water' | 'sentence' | 'sound';

export interface WeeklyMission {
  key: WeeklyMissionKey;
  goal: number;
  count: number;
  done: boolean;
}

/** `GET /missions/weekly`. */
export interface WeeklyMissions {
  /** The learner's local Monday, YYYY-MM-DD. */
  weekStart: string;
  /** Days after today until Sunday (0 on Sunday). */
  daysLeft: number;
  /** The sound of the week: `label` is its spelling ("th"), `examples` the learner's words with it. */
  sound: { key: string; label: string; examples: string[] };
  /** Always 3: rescue (water when nothing was wilting), sentence, sound. */
  missions: WeeklyMission[];
  /** All 3 done this week: the +1 rain barrel was added. */
  rewardEarned: boolean;
  /** Rain barrels held now (0–3). */
  freezes: number;
  /** Wilting words right now. */
  wilting: number;
  /** Topic word ids for the Speak button (planted or watered this week, with a sentence). */
  sentenceWords: string[];
  /** Topic word ids for the Say button (the sound, not pollinated yet). */
  soundWords: string[];
}

/**
 * `GET /api/v1/missions/weekly` — this week's 3 missions (A4), in the
 * learner's time zone. Refetched on every visit: sentences and pollinated
 * words (other query keys) move it too.
 */
export function useWeeklyMissions(timezone: string = getResolvedTimezone()) {
  return useQuery({
    queryKey: ['srs', 'missions', 'weekly', timezone],
    refetchOnMount: 'always',
    queryFn: () =>
      apiClient.get<WeeklyMissions>(`/missions/weekly?tz=${encodeURIComponent(timezone)}`),
  });
}
