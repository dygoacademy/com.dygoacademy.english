import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

/**
 * App locales the garden ships in (phase 12 plan, UI-L), as full BCP 47
 * codes (migrations 20260926_profile_locales_codes.sql and
 * 20260929_remove_en_sg_locale.sql). English is en-US.
 */
export const UI_LOCALES = ['en-US', 'vi-VN', 'zh-CN'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

/** Languages the review card can add a meaning line in; null = English only. */
export const MEANING_LOCALES = ['vi-VN', 'zh-CN'] as const;
export type MeaningLocale = (typeof MEANING_LOCALES)[number];

/** UI-6: the learner's English variety (20261001_retention.sql check). */
export const ENGLISH_VARIETIES = ['en-US', 'en-GB'] as const;
export type EnglishVariety = (typeof ENGLISH_VARIETIES)[number];

/** UI-6: daily goal bounds in minutes (same as the column's check). */
export const DAILY_GOAL_MIN = 1;
export const DAILY_GOAL_MAX = 120;

/**
 * Body for `PATCH /api/v1/profiles/me` (UI-L; UI-6 U6-4 adds the two
 * preferences). Every field optional: leave one out to keep it; the two
 * locales take `null` to clear them (no app language chosen yet / no
 * meaning language), `englishVariety` and `dailyGoalMinutes` do not.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    enum: UI_LOCALES,
    nullable: true,
    description: 'Garden app language. null = not chosen (cookie / browser language decide).',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(UI_LOCALES)
  uiLocale?: UiLocale | null;

  @ApiPropertyOptional({
    enum: MEANING_LOCALES,
    nullable: true,
    description: 'Extra meaning line on the review card. null = English definition only.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(MEANING_LOCALES)
  meaningLocale?: MeaningLocale | null;

  @ApiPropertyOptional({
    enum: ENGLISH_VARIETIES,
    description: 'UI-6: UK/US English for spellings and audio. Not nullable.',
  })
  // Not IsOptional (that would let null through to a NOT NULL column): only undefined skips.
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(ENGLISH_VARIETIES)
  englishVariety?: EnglishVariety;

  @ApiPropertyOptional({
    minimum: DAILY_GOAL_MIN,
    maximum: DAILY_GOAL_MAX,
    description: 'UI-6: daily goal in whole minutes (1–120). Not nullable.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(DAILY_GOAL_MIN)
  @Max(DAILY_GOAL_MAX)
  dailyGoalMinutes?: number;
}
