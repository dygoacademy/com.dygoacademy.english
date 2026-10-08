/**
 * Onboarding OB1–OB5 pure helpers (no React): the choices offered, their
 * defaults, the target band steppers and the OB4 sun arc.
 */
import type { OnboardingLevel, StudyGoal } from '@/hooks/useOnboarding';

import type { ClockTime } from '../format';

/** OB1: levels offered, by "I can…" sentence (A2–C1). */
export const ONBOARDING_LEVELS: readonly OnboardingLevel[] = ['A2', 'B1', 'B2', 'C1'];

/**
 * OB1 Skip and "Not sure?" both start at B1 (D-7 is undecided: no level
 * check is built; reviews can move the learner later).
 */
export const DEFAULT_LEVEL: OnboardingLevel = 'B1';

export const STUDY_GOALS: readonly StudyGoal[] = ['IELTS', 'PTE', 'LIFE'];

/**
 * OB2 target steppers. The stored values match the table's check
 * (IELTS half bands 4–9, PTE whole points 30–90); PTE steps by 5 on screen
 * so a typical target is a few taps away.
 */
export const BAND_STEPPERS = {
  IELTS: { min: 4, max: 9, step: 0.5, start: 7 },
  PTE: { min: 30, max: 90, step: 5, start: 65 },
} as const;

export type BandGoal = keyof typeof BAND_STEPPERS;

export function hasBand(goal: StudyGoal | null): goal is BandGoal {
  return goal === 'IELTS' || goal === 'PTE';
}

/** The band shown for `goal`: the saved one when it fits, else the stepper's start. */
export function initialBand(goal: BandGoal, saved: number | null | undefined): number {
  const { min, max, start } = BAND_STEPPERS[goal];
  return typeof saved === 'number' && saved >= min && saved <= max ? saved : start;
}

/** One stepper press (`direction` ±1), clamped to the goal's range. */
export function stepBand(goal: BandGoal, band: number, direction: 1 | -1): number {
  const { min, max, step } = BAND_STEPPERS[goal];
  const next = Math.round((band + direction * step) / step) * step;
  return Math.min(max, Math.max(min, next));
}

/** "7" → "7.0" for IELTS (bands are written with one decimal); PTE as is. */
export function formatBand(goal: BandGoal, band: number): string {
  return goal === 'IELTS' ? band.toFixed(1) : String(band);
}

// ---------------------------------------------------------------------------
// OB4 sun arc: morning (left) → night (right), 06:00–23:00.

export const ARC_START_MINUTES = 6 * 60;
export const ARC_END_MINUTES = 23 * 60;
/** Dragging snaps to quarter hours; arrow keys move one snap. */
export const ARC_SNAP_MINUTES = 15;

export const REMINDER_PRESETS = [
  { id: 'morning', time: { hour: 7, minute: 30 } },
  { id: 'lunch', time: { hour: 12, minute: 30 } },
  { id: 'evening', time: { hour: 19, minute: 0 } },
  { id: 'night', time: { hour: 21, minute: 30 } },
] as const satisfies ReadonlyArray<{ id: string; time: ClockTime }>;

export function clockToMinutes(time: ClockTime): number {
  return time.hour * 60 + time.minute;
}

/** Minutes after midnight → a clock time, snapped and kept on the arc. */
export function minutesToClock(minutes: number): ClockTime {
  const snapped = Math.round(minutes / ARC_SNAP_MINUTES) * ARC_SNAP_MINUTES;
  const clamped = Math.min(ARC_END_MINUTES, Math.max(ARC_START_MINUTES, snapped));
  return { hour: Math.floor(clamped / 60), minute: clamped % 60 };
}

/** 0 at the left end of the arc (06:00), 1 at the right end (23:00). */
export function arcFraction(time: ClockTime): number {
  const minutes = Math.min(ARC_END_MINUTES, Math.max(ARC_START_MINUTES, clockToMinutes(time)));
  return (minutes - ARC_START_MINUTES) / (ARC_END_MINUTES - ARC_START_MINUTES);
}

/**
 * Where the sun sits on a half circle centred at (cx, cy) with radius r:
 * fraction 0 is the left end, 0.5 the top, 1 the right end (SVG y grows down).
 */
export function arcPoint(fraction: number, cx: number, cy: number, r: number): { x: number; y: number } {
  const angle = Math.PI * (1 - fraction);
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

/** A pointer at (x, y) → the time under it on the arc (angle from the centre). */
export function pointToClock(x: number, y: number, cx: number, cy: number): ClockTime {
  // Below the centre line counts as the nearer end of the arc.
  const angle = Math.atan2(Math.max(0, cy - y), x - cx);
  const fraction = 1 - angle / Math.PI;
  return minutesToClock(ARC_START_MINUTES + fraction * (ARC_END_MINUTES - ARC_START_MINUTES));
}

/** "07:30" for POST /notifications/schedules (`reminderTime`). */
export function clockToHhmm(time: ClockTime): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

/** Morning / day / evening / night, for the arc's sky (and its label). */
export function partOfDay(time: ClockTime): 'morning' | 'day' | 'evening' | 'night' {
  const minutes = clockToMinutes(time);
  if (minutes < 11 * 60) return 'morning';
  if (minutes < 17 * 60) return 'day';
  if (minutes < 21 * 60) return 'evening';
  return 'night';
}
