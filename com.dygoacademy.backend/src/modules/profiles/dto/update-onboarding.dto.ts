import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsUUID, ValidateIf } from 'class-validator';

/** OB1 levels offered ("I can…" sentences). Skip / "Not sure?" = B1 (D-7 open). */
export const ONBOARDING_LEVELS = ['A2', 'B1', 'B2', 'C1'] as const;
export type OnboardingLevel = (typeof ONBOARDING_LEVELS)[number];

/** OB2 goals: IELTS, PTE or "just for life". */
export const STUDY_GOALS = ['IELTS', 'PTE', 'LIFE'] as const;
export type StudyGoal = (typeof STUDY_GOALS)[number];

/** OB2 target bounds, same as `profiles_target_band_check` (20261008_onboarding.sql). */
export const TARGET_BANDS = {
  IELTS: { min: 4, max: 9, step: 0.5 },
  PTE: { min: 30, max: 90, step: 1 },
} as const;

/**
 * Body for `PATCH /api/v1/profiles/me/onboarding` (OB1–OB5). Every field
 * optional, so each step saves its own choice. `target_band` is sent with
 * `study_goal` (it only means something for that goal); `study_goal: LIFE`
 * clears the band. `complete: true` (OB5) sets `onboarded_at` the first
 * time and leaves it after that.
 */
export class UpdateOnboardingDto {
  @ApiPropertyOptional({ enum: ONBOARDING_LEVELS, description: 'OB1: the learner’s level.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(ONBOARDING_LEVELS)
  cefr_level?: OnboardingLevel;

  @ApiPropertyOptional({ enum: STUDY_GOALS, description: 'OB2: IELTS, PTE or LIFE.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(STUDY_GOALS)
  study_goal?: StudyGoal;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'OB2: IELTS 4.0–9.0 in half bands, PTE 30–90 whole points; null = none. ' +
      'Needs `study_goal` in the same body.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  target_band?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'OB3: the first bed (a topic the caller can see); null clears it.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('loose')
  first_topic_id?: string | null;

  @ApiPropertyOptional({ description: 'OB5: true marks onboarding finished.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  complete?: boolean;
}
