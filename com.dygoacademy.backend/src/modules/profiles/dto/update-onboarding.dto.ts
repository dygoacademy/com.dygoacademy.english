import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** OB1 levels offered (4 tiles, A1–A2 stored as A2). Default B1 (D-7 open). */
export const ONBOARDING_LEVELS = ['A2', 'B1', 'B2', 'C1'] as const;
export type OnboardingLevel = (typeof ONBOARDING_LEVELS)[number];

/**
 * OB1 goal chips (2026-10-12): IELTS (= IELTS Academic), IELTS_GENERAL,
 * WORK, TRAVEL, LIFE (= "Just for me"). PTE is no longer offered on screen,
 * but rows that have it stay valid (20261012_onboarding_goals.sql).
 */
export const STUDY_GOALS = ['IELTS', 'IELTS_GENERAL', 'WORK', 'TRAVEL', 'LIFE', 'PTE'] as const;
export type StudyGoal = (typeof STUDY_GOALS)[number];

/** Target bounds, same as `profiles_target_band_check` (20261012_onboarding_goals.sql). */
export const TARGET_BANDS = {
  IELTS: { min: 4, max: 9, step: 0.5 },
  IELTS_GENERAL: { min: 4, max: 9, step: 0.5 },
  PTE: { min: 30, max: 90, step: 1 },
} as const;
export type BandGoal = keyof typeof TARGET_BANDS;

export function hasBand(goal: StudyGoal): goal is BandGoal {
  return goal in TARGET_BANDS;
}

/**
 * Body for `PATCH /api/v1/profiles/me/onboarding` (OB1 About you, OB5).
 * Every field optional. `target_band` is sent with `study_goal` (it only
 * means something for that goal); a goal without a band (WORK, TRAVEL,
 * LIFE) clears it. `timezone` is the browser's zone, kept only while the
 * profile has none. `complete: true` (OB5) sets `onboarded_at` the first
 * time and leaves it after that.
 */
export class UpdateOnboardingDto {
  @ApiPropertyOptional({ enum: ONBOARDING_LEVELS, description: 'OB1: the learner’s level.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(ONBOARDING_LEVELS)
  cefr_level?: OnboardingLevel;

  @ApiPropertyOptional({
    enum: STUDY_GOALS,
    description:
      'OB1: IELTS (Academic), IELTS_GENERAL, WORK, TRAVEL or LIFE (PTE kept for old rows).',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(STUDY_GOALS)
  study_goal?: StudyGoal;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'OB1: IELTS / IELTS_GENERAL 4.0–9.0 in half bands, PTE 30–90 whole points; null = none. ' +
      'Needs `study_goal` in the same body.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  target_band?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'The first bed (a topic the caller can see); null clears it. Picked from the goal ' +
      'when not sent.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('loose')
  first_topic_id?: string | null;

  @ApiPropertyOptional({
    description: "OB1: the browser's IANA time zone; saved only while the profile has none.",
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ description: 'OB5: true marks onboarding finished.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  complete?: boolean;
}
