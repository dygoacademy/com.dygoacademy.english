import { describe, expect, it } from 'vitest';

import {
  BAND_STEPPERS,
  clockLabel,
  clockToHhmm,
  DEFAULT_LEVEL,
  DEFAULT_REMINDER,
  formatBand,
  hasBand,
  initialBand,
  REMINDER_CHOICES,
  reminderChoiceAt,
  stepBand,
  STUDY_GOALS,
} from './onboarding';

describe('OB1 choices', () => {
  it('starts on B1 and offers the five goal chips (no PTE)', () => {
    expect(DEFAULT_LEVEL).toBe('B1');
    expect(STUDY_GOALS).toEqual(['IELTS', 'IELTS_GENERAL', 'WORK', 'TRAVEL', 'LIFE']);
  });

  it('only the IELTS goals (and old PTE rows) have a band', () => {
    expect(STUDY_GOALS.filter(hasBand)).toEqual(['IELTS', 'IELTS_GENERAL']);
    expect(hasBand('PTE')).toBe(true);
    expect(hasBand(null)).toBe(false);
    expect(BAND_STEPPERS.IELTS_GENERAL).toEqual(BAND_STEPPERS.IELTS);
  });

  it('steps IELTS bands by halves within 4.0–9.0, starting at 7.0', () => {
    expect(initialBand('IELTS_GENERAL', null)).toBe(7);
    expect(initialBand('IELTS', 6.5)).toBe(6.5);
    expect(initialBand('IELTS', 12)).toBe(7);
    expect(stepBand('IELTS', 7, 1)).toBe(7.5);
    expect(stepBand('IELTS', 9, 1)).toBe(9);
    expect(stepBand('IELTS_GENERAL', 4, -1)).toBe(4);
    expect(formatBand('IELTS_GENERAL', 7)).toBe('7.0');
    expect(formatBand('PTE', 65)).toBe('65');
  });
});

describe('OB4 choices', () => {
  it('Morning 7:30, Lunch 12:30, Evening 21:00; Morning first', () => {
    expect(REMINDER_CHOICES.map((choice) => [choice.id, clockLabel(choice.time)])).toEqual([
      ['morning', '7:30'],
      ['lunch', '12:30'],
      ['evening', '21:00'],
    ]);
    expect(DEFAULT_REMINDER).toBe('morning');
  });

  it('finds the choice at a saved time (none for another time)', () => {
    expect(reminderChoiceAt({ hour: 21, minute: 0 })).toBe('evening');
    expect(reminderChoiceAt({ hour: 19, minute: 0 })).toBeNull();
    expect(reminderChoiceAt(null)).toBeNull();
  });

  it('writes the schedule time as HH:MM', () => {
    expect(clockToHhmm({ hour: 7, minute: 30 })).toBe('07:30');
  });
});
