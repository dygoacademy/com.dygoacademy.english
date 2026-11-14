import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { REMINDER_CHANNELS, type ReminderChannel } from '../reminder-rules';

/**
 * Body for `POST /api/v1/notifications/schedules` (FR-6.1): sets the
 * learner's one daily reminder. Since 20261114_reminder_settings.sql a
 * learner has one row (`study_schedules_one_per_user`), so a new
 * `reminderTime` moves the reminder instead of adding a second one, and
 * posting the same body twice changes nothing.
 *
 * A8c (2026-11-14) adds `days`, `smart` and `channels`; leave one out to
 * keep what is saved (a new reminder gets Monday–Saturday, Smart off, push).
 */
export class UpsertScheduleDto {
  @ApiProperty({
    example: '20:00',
    description: '24-hour local time, HH:MM. Interpreted in `timezone` below, not UTC.',
  })
  // Seconds are accepted too: GET /notifications/schedules lists times as
  // HH:MM:SS, and an installed app may still run a build that sends that back.
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'reminderTime must be 24-hour HH:MM, e.g. "20:00".',
  })
  reminderTime!: string;

  @ApiProperty({
    example: 'Asia/Singapore',
    description:
      'IANA zone name. Stored as a string so DST is resolved by the database, not a stale UTC offset.',
  })
  @Matches(/^[A-Za-z][A-Za-z0-9_+\-/]*$/, {
    message: 'timezone must be an IANA zone name, e.g. "Asia/Singapore" or "UTC".',
  })
  timezone!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2, 3, 4, 5, 6],
    description: 'A8c: ISO weekdays, 1 = Monday … 7 = Sunday. Empty = no day.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  days?: number[];

  @ApiPropertyOptional({
    description:
      'A8c: send when most words ripen (outside quiet hours) instead of at reminderTime.',
  })
  @IsOptional()
  @IsBoolean()
  smart?: boolean;

  @ApiPropertyOptional({
    enum: REMINDER_CHANNELS,
    isArray: true,
    description: 'A8c: push, zalo, email. Only push has a sender today; the others are saved.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(REMINDER_CHANNELS, { each: true })
  channels?: ReminderChannel[];
}
