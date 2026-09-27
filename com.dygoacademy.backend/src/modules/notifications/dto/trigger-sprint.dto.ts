import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { RAIN_DAY_WORDS } from '../../groups/rain-day.service';

/**
 * Body for `POST /api/v1/notifications/groups/:groupId/sprint` (FR-6.2).
 * Immediate, not scheduled — a teacher wants this to land now, not on the
 * next 15-minute tick, so it bypasses NotificationProcessor entirely and
 * calls PushDispatchService directly. See NotificationsService.triggerSprint.
 */
export class TriggerSprintDto {
  @ApiPropertyOptional({
    maxLength: 200,
    description: 'Defaults to a generic "your teacher posted a reminder" message when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;

  @ApiPropertyOptional({
    description: 'Deep-links the notification to this topic instead of /study.',
  })
  @IsOptional()
  @IsUUID('loose')
  topicId?: string;

  @ApiPropertyOptional({
    enum: RAIN_DAY_WORDS,
    default: 10,
    description:
      'UI-G rain day goal: words from the shared beds each gardener waters today (5, 10 or 20). ' +
      'Every sprint now also stores a rain day; classic callers omit this and get 10.',
  })
  @IsOptional()
  @IsIn(RAIN_DAY_WORDS)
  wordsPerGardener?: number;
}
