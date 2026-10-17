import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../../database/database.service';
import { RAIN_DAY_DEFAULT_WORDS, RainDayService, StartedRainDay } from '../groups/rain-day.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { TriggerSprintDto } from './dto/trigger-sprint.dto';
import { UpsertScheduleDto } from './dto/upsert-schedule.dto';
import { PushDispatchService } from './push-dispatch.service';

export interface StudySchedule {
  id: string;
  reminder_time: string;
  timezone: string;
  is_enabled: boolean;
}

export interface SprintResult {
  recipients: number;
  sent: number;
  pruned: number;
  /** UI-G RD-2: the rain day this sprint started. */
  rainDay: StartedRainDay;
}

/** Module 6 — Web Push subscriptions & habit scheduling (Phase 3). */
@Injectable()
export class NotificationsService {
  constructor(
    protected readonly db: DatabaseService,
    private readonly pushDispatch: PushDispatchService,
    private readonly config: ConfigService,
    private readonly rainDays: RainDayService,
  ) {}

  vapidPublicKey(): { publicKey: string } {
    return { publicKey: this.pushDispatch.vapidPublicKey() };
  }

  /**
   * `on conflict (endpoint)` — `push_subscriptions_endpoint_unique`
   * (001_initial_schema.sql). One browser's subscription is one row
   * regardless of which account last registered it; re-subscribing (e.g.
   * after a token refresh browsers occasionally do) updates the existing
   * row's keys rather than erroring or leaving a stale duplicate.
   * Under RLS the conflict can only be the caller's own row; another
   * account's row for the same browser is removed first.
   */
  async subscribe(userId: string, dto: SubscribePushDto): Promise<{ id: string }> {
    // A browser that last subscribed for another account (two accounts on
    // one phone) leaves a row the caller can't see under RLS, so the upsert
    // below failed with "new row violates row-level security policy" and
    // the reminder switch could never turn on (2026-10-17). The browser now
    // belongs to whoever subscribes it last: drop the other account's row
    // first, as service_role (it has delete on push_subscriptions).
    await this.db.queryAsService(
      `delete from public.push_subscriptions where endpoint = $1 and user_id <> $2`,
      [dto.endpoint, userId],
    );
    const [row] = await this.db.queryAs<{ id: string }>(
      userId,
      `insert into public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent, last_used_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (endpoint) do update set
         user_id      = excluded.user_id,
         p256dh_key   = excluded.p256dh_key,
         auth_key     = excluded.auth_key,
         user_agent   = excluded.user_agent,
         last_used_at = now()
       returning id`,
      [userId, dto.endpoint, dto.keys.p256dh, dto.keys.auth, dto.userAgent ?? null],
    );
    return row;
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    const deleted = await this.db.queryAs<{ id: string }>(
      userId,
      `delete from public.push_subscriptions where user_id = $1 and endpoint = $2 returning id`,
      [userId, endpoint],
    );
    if (deleted.length === 0) {
      throw new NotFoundException('Subscription not found.');
    }
  }

  async listSchedules(userId: string): Promise<StudySchedule[]> {
    return this.db.queryAs<StudySchedule>(
      userId,
      `select id, reminder_time::text, timezone, is_enabled
         from public.study_schedules
        where user_id = $1
        order by reminder_time asc`,
      [userId],
    );
  }

  /**
   * `on conflict (user_id, reminder_time)` — see UpsertScheduleDto's header
   * comment. A second POST for the same clock time toggles `is_enabled` /
   * updates the timezone rather than erroring, which matters because the
   * frontend's settings screen has no separate "edit" affordance — the
   * time picker and the save button are the same form either way.
   */
  async upsertSchedule(userId: string, dto: UpsertScheduleDto): Promise<StudySchedule> {
    const [row] = await this.db.queryAs<StudySchedule>(
      userId,
      `insert into public.study_schedules (user_id, reminder_time, timezone, is_enabled)
       values ($1, $2::time, $3, $4)
       on conflict (user_id, reminder_time) do update set
         timezone   = excluded.timezone,
         is_enabled = excluded.is_enabled,
         updated_at = now()
       returning id, reminder_time::text, timezone, is_enabled`,
      [userId, dto.reminderTime, dto.timezone, dto.isEnabled ?? true],
    );
    return row;
  }

  async deleteSchedule(userId: string, id: string): Promise<void> {
    const deleted = await this.db.queryAs<{ id: string }>(
      userId,
      `delete from public.study_schedules where user_id = $1 and id = $2 returning id`,
      [userId, id],
    );
    if (deleted.length === 0) {
      throw new NotFoundException('Schedule not found.');
    }
  }

  /**
   * FR-6.2 — an immediate, teacher-triggered push to every member of a
   * group who has at least one push subscription. Explicit application-level
   * `has_group_role` check (unlike most writes in this codebase, which lean
   * on RLS's `with check` and let a violation surface as a generic error —
   * see GroupsService.createInvite's header comment) because there is no
   * table row being written here for RLS to gate; `ForbiddenException` is
   * the only enforcement point.
   */
  async triggerSprint(
    userId: string,
    groupId: string,
    dto: TriggerSprintDto,
  ): Promise<SprintResult> {
    const [{ allowed }] = await this.db.queryAs<{ allowed: boolean }>(
      userId,
      `select public.has_group_role($1, 'ADMIN') as allowed`,
      [groupId],
    );
    if (!allowed) {
      throw new ForbiddenException('Only a group ADMIN can trigger a class sprint.');
    }

    const members = await this.db.queryAs<{ user_id: string }>(
      userId,
      `select user_id from public.group_members where group_id = $1 and user_id != $2`,
      [groupId, userId],
    );
    if (members.length === 0) {
      throw new ConflictException('This group has no other members to notify.');
    }

    // UI-G RD-2: store today's rain day before any push goes out. A second
    // one the same local day is a 409 from RainDayService and nothing is sent.
    const rainDay = await this.rainDays.start(
      userId,
      groupId,
      dto.wordsPerGardener ?? RAIN_DAY_DEFAULT_WORDS,
      dto.message,
    );

    const frontendUrl = this.config.get<string>('frontendUrl', 'http://localhost:3000');
    const payload = {
      title: 'Message from your teacher',
      body: dto.message?.trim() || 'Your teacher posted a class reminder — take a look.',
      path: dto.topicId ? `/topics/${dto.topicId}` : '/study',
      tag: 'sprint' as const,
    };

    const results = await Promise.all(
      members.map((m) => this.pushDispatch.sendToUser(m.user_id, payload, frontendUrl)),
    );

    const totals = results.reduce(
      (acc, r) => ({
        recipients: acc.recipients + 1,
        sent: acc.sent + r.sent,
        pruned: acc.pruned + r.pruned,
      }),
      { recipients: 0, sent: 0, pruned: 0 },
    );
    return { ...totals, rainDay };
  }
}
