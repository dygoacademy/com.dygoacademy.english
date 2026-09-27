import { Module } from '@nestjs/common';

import { SprintRateLimitGuard } from '../../common/guards/sprint-rate-limit.guard';
import { GroupsModule } from '../groups/groups.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushDispatchService } from './push-dispatch.service';

/**
 * Module 6 — Web Push & Habit Scheduling (Phase 3). `PushDispatchService`
 * is exported (not just a local provider) so `NotificationProcessor`
 * (src/workers/notification.processor.ts) can inject the same send/cleanup
 * logic this module's own controller uses for FR-6.2's immediate sprint —
 * one implementation of "how a push gets sent," not two.
 *
 * `SprintRateLimitGuard` is registered here (not just referenced via
 * `@UseGuards`) so Nest's DI container keeps it a singleton — its cooldown
 * `Map` has to survive across requests to do anything at all. An
 * unregistered guard class is still instantiated by Nest, but nothing
 * guarantees the same instance is reused per call, which would silently
 * turn the whole guard into a no-op.
 */
@Module({
  // GroupsModule for RainDayService: every sprint stores a rain day (UI-G RD-2).
  imports: [GroupsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushDispatchService, SprintRateLimitGuard],
  exports: [NotificationsService, PushDispatchService],
})
export class NotificationsModule {}
