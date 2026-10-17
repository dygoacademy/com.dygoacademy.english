import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, Matches } from 'class-validator';

/**
 * Body for `POST /api/v1/notifications/schedules` (FR-6.1). Upsert, not
 * create-only — `study_schedules_unique_time_per_user` (001_initial_schema.sql)
 * means posting the same `reminderTime` twice for one user is a toggle/edit,
 * not a duplicate-row error, matching how `SrsService.rate`'s
 * `on conflict ... do update` treats a second rating for the same word as
 * "update," not "reject."
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
}
