import { Module } from '@nestjs/common';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushDispatchService } from './push-dispatch.service';

/**
 * Module 6 — Web Push & Habit Scheduling (Phase 3). `PushDispatchService`
 * is exported (not just a local provider) so `NotificationProcessor`
 * (src/workers/notification.processor.ts) can inject the same send/cleanup
 * logic this module's own controller uses for FR-6.2's immediate sprint —
 * one implementation of "how a push gets sent," not two.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushDispatchService],
  exports: [NotificationsService, PushDispatchService],
})
export class NotificationsModule {}
