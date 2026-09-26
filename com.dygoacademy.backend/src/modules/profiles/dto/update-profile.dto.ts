import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, ValidateIf } from 'class-validator';

/**
 * App locales the garden ships in (phase 12 plan, UI-L), as full BCP 47
 * codes since 2026-09-26 (migration 20260926_profile_locales_codes.sql).
 */
export const UI_LOCALES = ['en-SG', 'en-US', 'vi-VN', 'zh-CN'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

/** Languages the review card can add a meaning line in; null = English only. */
export const MEANING_LOCALES = ['vi-VN', 'zh-CN'] as const;
export type MeaningLocale = (typeof MEANING_LOCALES)[number];

/**
 * Body for `PATCH /api/v1/profiles/me` (UI-L). Both fields optional:
 * leave one out to keep it, send `null` to clear it (no app language
 * chosen yet / no meaning language).
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
}
