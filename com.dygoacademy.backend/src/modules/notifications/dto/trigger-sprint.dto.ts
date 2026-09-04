import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
}
