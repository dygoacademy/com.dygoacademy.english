'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { getResolvedTimezone } from '@/lib/timezone';

/** UI-6 daily mission types (backend `modules/missions/missions.store.ts`). */
export type MissionType = 'REVIEW_DUE' | 'LEARN_NEW' | 'QUIZ';

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
  /** All 3 missions done today. */
  goldenBloom: boolean;
}

/** One row of `GET /missions/week` (oldest first, today last). */
export interface MissionDay {
  date: string;
  /** Missions completed that local day (0–3). */
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
