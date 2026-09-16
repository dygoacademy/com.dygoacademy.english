import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

import { DatabaseService } from '../../database/database.service';

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

/**
 * Deliberately its own type rather than importing `ReminderPayload` from
 * `notification-message.ts`: that file's `tag` union (leech/streak/habit)
 * is specific to the tick's own decision logic, while FR-6.2's sprint push
 * (NotificationsService.triggerSprint) needs a `'sprint'` tag this service
 * has no reason to know is disjoint from those three.
 */
export interface PushPayload {
  title: string;
  body: string;
  /** Path, not a full URL — joined with `frontendUrl` below. */
  path: string;
  tag: string;
}

export interface DispatchResult {
  sent: number;
  /** Subscriptions removed because the push service reported them dead (410/404). */
  pruned: number;
  /** Attempts that failed for a reason other than "subscription is dead" — logged, not thrown. */
  failed: number;
}

/**
 * Owns the actual VAPID web-push send + dead-subscription cleanup (FR-6.5).
 * Shared by two callers with different timing needs: NotificationProcessor
 * (the 15-minute tick, FR-6.1/6.3/6.4) and NotificationsService.triggerSprint
 * (FR-6.2's immediate teacher-triggered push) — one definition of "how a
 * push gets sent and what happens when it fails," same reasoning
 * `SrsService.findLeeches` gets reused by `QuizService.leechDrill` rather
 * than each caller reimplementing the send/cleanup loop.
 *
 * Runs in a background/no-request context in both call sites (a BullMQ job,
 * or a teacher's request fanning out to many students' subscriptions), so it
 * reads `push_subscriptions` with `DatabaseService.query` — the same
 * unscoped-pool pattern `EnrichmentProcessor` uses to write `topic_words`
 * across users, not `queryAs`, which is scoped to a single caller's RLS
 * identity.
 */
@Injectable()
export class PushDispatchService {
  private readonly logger = new Logger(PushDispatchService.name);
  private readonly configured: boolean;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('vapid.publicKey', '');
    const privateKey = this.config.get<string>('vapid.privateKey', '');
    const subject = this.config.get<string>('vapid.subject', 'mailto:dev@dygo.test');

    this.configured = Boolean(publicKey && privateKey);
    if (this.configured) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      // Matches GeminiEnrichmentService's rule: a missing key degrades a
      // feature, it doesn't block API boot. Every send becomes a no-op below.
      this.logger.warn('VAPID keys not configured — push notifications are disabled.');
    }
  }

  vapidPublicKey(): string {
    return this.config.get<string>('vapid.publicKey', '');
  }

  /**
   * Sends `payload` to every subscription `userId` has registered (a student
   * may have several — phone, laptop, etc.). Per-subscription failures are
   * isolated: one dead endpoint does not stop delivery to the others, same
   * "a single failure isn't the whole batch's failure" instinct as
   * `QuizService.answer`'s per-item Gemini degradation and
   * `SrsService.sync`'s per-review error isolation.
   */
  async sendToUser(
    userId: string,
    payload: PushPayload,
    frontendUrl: string,
  ): Promise<DispatchResult> {
    if (!this.configured) {
      return { sent: 0, pruned: 0, failed: 0 };
    }

    // queryAsService, not the unscoped query() authenticator connects as:
    // this runs for an arbitrary userId with no request-scoped JWT to set
    // (a BullMQ tick, or triggerSprint fanning out to a whole class), and
    // authenticator has zero table grants of its own by design (see
    // DatabaseService.withServiceRole's doc comment and migration 015 --
    // same root cause EnrichmentProcessor hit on master_lexicon/topic_words,
    // live-verified again here 2026-09-16: "permission denied for table
    // push_subscriptions").
    const subs = await this.db.queryAsService<PushSubscriptionRow>(
      `select id, endpoint, p256dh_key, auth_key from public.push_subscriptions where user_id = $1`,
      [userId],
    );

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      // Absolute URL: the service worker's notificationclick handler opens
      // this directly (FR-6.5's "1-tap link"), no client-side base to join it to.
      url: `${frontendUrl}${payload.path}`,
      tag: payload.tag,
    });

    const result: DispatchResult = { sent: 0, pruned: 0, failed: 0 };

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
            },
            body,
          );
          result.sent += 1;
          await this.db
            .queryAsService(`update public.push_subscriptions set last_used_at = now() where id = $1`, [
              sub.id,
            ])
            .catch(() => undefined);
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // The push service itself says this endpoint will never accept
            // another push (browser uninstalled, permission revoked, etc.).
            // Pruning here means the next tick doesn't keep retrying a dead
            // endpoint forever.
            await this.db
              .queryAsService(`delete from public.push_subscriptions where id = $1`, [sub.id])
              .catch(() => undefined);
            result.pruned += 1;
          } else {
            result.failed += 1;
            this.logger.warn(
              `push send failed for subscription ${sub.id} (user ${userId}): ${
                err instanceof Error ? err.message : err
              }`,
            );
          }
        }
      }),
    );

    return result;
  }
}
