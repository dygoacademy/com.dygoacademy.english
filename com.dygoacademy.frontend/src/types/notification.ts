/**
 * `GET /api/v1/notifications/schedules` / `POST .../schedules` (FR-6.1) —
 * mirrors `NotificationsService.StudySchedule`
 * (com.dygoacademy.backend/src/modules/notifications/notifications.service.ts)
 * field-for-field, same "no camelCase" rule as `srs.ts`'s `DueCard`.
 */
export interface StudySchedule {
  id: string;
  /** 24-hour "HH:MM:SS", local to `timezone` below. */
  reminder_time: string;
  timezone: string;
  is_enabled: boolean;
}

/** `POST /api/v1/notifications/groups/:groupId/sprint` (FR-6.2) response. */
export interface SprintResult {
  recipients: number;
  sent: number;
  pruned: number;
  /** UI-G RD-2: the rain day the sprint stored (absent on older backends). */
  rainDay?: { id: string; endsAt: string; wordsPerGardener: number };
}
