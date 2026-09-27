import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SprintRateLimitGuard } from '../../common/guards/sprint-rate-limit.guard';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { TriggerSprintDto } from './dto/trigger-sprint.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
import { UpsertScheduleDto } from './dto/upsert-schedule.dto';
import { NotificationsService, SprintResult, StudySchedule } from './notifications.service';

@ApiBearerAuth()
@ApiTags('notifications')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  @ApiOperation({
    summary: 'VAPID public key (FR-6.5)',
    description:
      'The frontend passes this as `applicationServerKey` to ' +
      '`pushManager.subscribe()`. Not a secret — kept behind auth anyway ' +
      'since only a signed-in student ever needs it.',
  })
  vapidPublicKey(): { publicKey: string } {
    return this.notificationsService.vapidPublicKey();
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a browser push subscription (FR-6.5)' })
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: SubscribePushDto,
  ): Promise<{ id: string }> {
    return this.notificationsService.subscribe(userId, dto);
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a browser push subscription' })
  async unsubscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: UnsubscribePushDto,
  ): Promise<void> {
    await this.notificationsService.unsubscribe(userId, dto.endpoint);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'List the caller’s daily reminder schedules (FR-6.1)' })
  async listSchedules(@CurrentUser('id') userId: string): Promise<StudySchedule[]> {
    return this.notificationsService.listSchedules(userId);
  }

  @Post('schedules')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or update a daily reminder time (FR-6.1)',
    description: 'Upsert on (user, reminderTime) — see UpsertScheduleDto.',
  })
  async upsertSchedule(
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertScheduleDto,
  ): Promise<StudySchedule> {
    return this.notificationsService.upsertSchedule(userId, dto);
  }

  @Delete('schedules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a reminder schedule' })
  async deleteSchedule(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<void> {
    await this.notificationsService.deleteSchedule(userId, id);
  }

  @Post('groups/:groupId/sprint')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SprintRateLimitGuard)
  @ApiOperation({
    summary: 'Trigger an immediate class-wide reminder (FR-6.2)',
    description:
      'ADMIN-only. Pushes to every other member’s registered devices right now, not on the next tick. ' +
      'Also stores today’s rain day (UI-G; optional `wordsPerGardener` 5/10/20, default 10) and returns it as `rainDay`; ' +
      'a second one the same local day is 409 and nothing is sent. ' +
      `Rate-limited to one sprint per group per ${SprintRateLimitGuard.COOLDOWN_MS / 1000}s (429 Too Many Requests otherwise).`,
  })
  async triggerSprint(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: TriggerSprintDto,
  ): Promise<SprintResult> {
    return this.notificationsService.triggerSprint(userId, groupId, dto);
  }
}
