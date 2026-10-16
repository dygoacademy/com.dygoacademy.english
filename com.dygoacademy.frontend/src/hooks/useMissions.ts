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
