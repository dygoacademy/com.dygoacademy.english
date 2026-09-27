'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { GroupRole } from '@/types';

/**
 * UI-G reads for the garden's group screens (backend GroupGardenService,
 * dygo_academy_api_surface.md). Aggregates only: nothing here carries
 * another learner's progress. The shapes live here rather than in
 * types/group.ts until that file's other uncommitted edits land.
 */

/**
 * A group's running rain day on GR1 (UI-G RD-3): totals plus the caller's
 * own count, never who. `endsAt` is the end of the starting admin's local
 * day (the next midnight there).
 */
export interface GardenRainDay {
  wordsPerGardener: number;
  gardeners: number;
  done: number;
  mine: number;
  endsAt: string;
}

/** GET /groups/garden-counts: one row per group the caller is in (GR1). */
export interface GroupGardenCounts {
  group_id: string;
  member_count: number;
  bed_count: number;
  word_count: number;
  my_due_count: number;
  /** Absent on a backend from before RD-3. */
  rainDay?: GardenRainDay | null;
}

/** One rain day from GET /groups/:id/rain-day (UI-G RD-2). */
export interface RainDaySummary extends GardenRainDay {
  id: string;
  startsAt: string;
}

/** GET /groups/:id/rain-day: the running rain day and the last finished one. */
export interface RainDayStatus {
  current: RainDaySummary | null;
  last: RainDaySummary | null;
}

/** A shared bed with the caller's own numbers (GR2). */
export interface GardenBed {
  topic_id: string;
  title: string;
  word_count: number;
  due_count: number;
  seed_count: number;
  sprout_count: number;
  flower_count: number;
  tree_count: number;
}

/** GET /groups/:id/garden (GR2). */
export interface GroupGarden {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  role: GroupRole;
  member_count: number;
  bed_count: number;
  word_count: number;
  watered_today: number;
  ripe_plants: number;
  total_plants: number;
  my_due_count: number;
  beds: GardenBed[];
}

/** GET /groups/:id/tricky-patches (GR3, admins). */
export interface TrickyPatch {
  topic_word_id: string;
  source_word: string;
  misses: number;
  gardeners: number;
}

/** GET /invites/:token/preview (GR6). */
export interface InvitePreview {
  group_id: string;
  group_name: string;
  group_description: string | null;
  inviter_name: string | null;
  grant_role: GroupRole;
  member_count: number;
  bed_count: number;
  word_count: number;
  already_member: boolean;
}

export function useGroupGardenCounts() {
  return useQuery({
    queryKey: ['groups', 'garden-counts'],
    queryFn: () => apiClient.get<GroupGardenCounts[]>('/groups/garden-counts'),
  });
}

export function useGroupGarden(groupId: string, timeZone: string | undefined) {
  return useQuery({
    queryKey: ['groups', groupId, 'garden', timeZone ?? ''],
    queryFn: () =>
      apiClient.get<GroupGarden>(
        `/groups/${encodeURIComponent(groupId)}/garden${timeZone ? `?tz=${encodeURIComponent(timeZone)}` : ''}`,
      ),
    enabled: Boolean(groupId),
  });
}

export function useGroupRainDay(groupId: string, enabled = true) {
  return useQuery({
    queryKey: ['groups', groupId, 'rain-day'],
    queryFn: () => apiClient.get<RainDayStatus>(`/groups/${encodeURIComponent(groupId)}/rain-day`),
    enabled: enabled && Boolean(groupId),
  });
}

export function useTrickyPatches(groupId: string, enabled = true) {
  return useQuery({
    queryKey: ['groups', groupId, 'tricky-patches'],
    queryFn: () =>
      apiClient.get<TrickyPatch[]>(`/groups/${encodeURIComponent(groupId)}/tricky-patches?days=7&limit=5`),
    enabled: enabled && Boolean(groupId),
  });
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: ['invites', token, 'preview'],
    queryFn: () => apiClient.get<InvitePreview>(`/invites/${encodeURIComponent(token)}/preview`),
    enabled: Boolean(token),
    retry: false,
  });
}
