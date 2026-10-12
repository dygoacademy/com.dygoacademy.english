/**
 * Onboarding pure helpers (no React): the choices offered on OB1 About you
 * and OB4 Reminder, their defaults, and the target band stepper.
 */
import type { OnboardingLevel, StudyGoal } from '@/hooks/useOnboarding';

import type { ClockTime } from '../format';

/** OB1: the four level tiles, in board order ("A1–A2" is stored as A2). */
export const ONBOARDING_LEVELS: readonly OnboardingLevel[] = ['A2', 'B1', 'B2', 'C1'];

/**
 * OB1 starts on B1 (D-7 is undecided: no level check is built; reviews can
 * move the learner later). The board shows B2 only as an example.
 */
export const DEFAULT_LEVEL: OnboardingLevel = 'B1';

/** OB1 goal chips, in board order. PTE is no longer offered (old rows keep it). */
export const STUDY_GOALS: readonly StudyGoal[] = ['IELTS', 'IELTS_GENERAL', 'WORK', 'TRAVEL', 'LIFE'];

/**
 * Target steppers. The stored values match the table's check (IELTS and
 * IELTS General half bands 4–9, PTE whole points 30–90); PTE steps by 5 on
 * screen so a typical target is a few taps away.
 */
export const BAND_STEPPERS = {
  IELTS: { min: 4, max: 9, step: 0.5, start: 7 },
  IELTS_GENERAL: { min: 4, max: 9, step: 0.5, start: 7 },
  PTE: { min: 30, max: 90, step: 5, start: 65 },
} as const;

export type BandGoal = keyof typeof BAND_STEPPERS;

export function hasBand(goal: StudyGoal | null): goal is BandGoal {
  return goal === 'IELTS' || goal === 'IELTS_GENERAL' || goal === 'PTE';
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
  return goal === 'PTE' ? String(band) : band.toFixed(1);
}

/** OB4: the three reminder choices (Morning is the default). */
export const REMINDER_CHOICES = [
  { id: 'morning', time: { hour: 7, minute: 30 } },
  { id: 'lunch', time: { hour: 12, minute: 30 } },
  { id: 'evening', time: { hour: 21, minute: 0 } },
] as const satisfies ReadonlyArray<{ id: string; time: ClockTime }>;

export type ReminderChoice = (typeof REMINDER_CHOICES)[number]['id'];

export const DEFAULT_REMINDER: ReminderChoice = 'morning';

/** The choice at `time`, or null for another time (one set in Profile). */
export function reminderChoiceAt(time: ClockTime | null): ReminderChoice | null {
  if (!time) return null;
  return (
    REMINDER_CHOICES.find(
      (choice) => choice.time.hour === time.hour && choice.time.minute === time.minute,
    )?.id ?? null
  );
}

/** "7:30", "21:00": onboarding writes times on a 24-hour clock in every language (boards OB4, OB5). */
export function clockLabel(time: ClockTime): string {
  return `${time.hour}:${String(time.minute).padStart(2, '0')}`;
}

/** "07:30" for POST /notifications/schedules (`reminderTime`). */
export function clockToHhmm(time: ClockTime): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}
