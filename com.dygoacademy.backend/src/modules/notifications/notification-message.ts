/**
 * Pure decision logic for the 15-minute habit tick (FR-6.1, FR-6.3, FR-6.4).
 * DB-free and unit-tested in isolation — same split `fsrs-scheduler.ts` and
 * `quiz-generator.ts` establish for their modules: NotificationProcessor
 * owns the Postgres reads and the actual web-push call, this file owns "what
 * does the notification say."
 *
 * DESIGN CALL: the BRD describes FR-6.1/6.3/6.4 as three separate triggers,
 * but nothing here tracks "was this user already notified today" — there is
 * no `notification_log` table (same "don't persist what can be derived"
 * instinct as Module 5's stateless quiz items). Instead, one tick decides
 * *one* message per matched schedule, priority-ordered so a student with
 * both leeches and a streak at risk gets the more actionable message rather
 * than two pushes. A user with nothing due gets nothing — a reminder to
 * study when there is genuinely no due card would just be noise.
 */

export interface ReminderStats {
  dueNow: number;
  leechCount: number;
  currentStreakDays: number;
}

export interface ReminderPayload {
  title: string;
  body: string;
  /** Path, not a full URL — NotificationProcessor prefixes it with `frontendUrl`. */
  path: string;
  tag: 'leech' | 'streak' | 'habit';
}

/**
 * Returns `null` when there is nothing worth interrupting the student for.
 *
 * Priority: leech drill (FR-6.4) > streak protection (FR-6.3) > plain daily
 * habit (FR-6.1). Leeches outrank streak protection because a leech alert is
 * actionable in under 3 minutes (BRD's own framing) and directly reduces
 * future leech growth; streak protection is otherwise just a more urgent
 * restatement of "you have cards due."
 */
export function buildReminderPayload(stats: ReminderStats): ReminderPayload | null {
  if (stats.leechCount > 0) {
    return {
      title: 'A few words keep tripping you up',
      body: `${stats.leechCount} word${stats.leechCount === 1 ? '' : 's'} need${
        stats.leechCount === 1 ? 's' : ''
      } a quick fix — 3 minutes, tops.`,
      path: '/quiz?mode=leech',
      tag: 'leech',
    };
  }

  if (stats.dueNow > 0 && stats.currentStreakDays > 0) {
    return {
      title: `Don't lose your ${stats.currentStreakDays}-day streak`,
      body: `${stats.dueNow} card${stats.dueNow === 1 ? ' is' : 's are'} waiting — keep it going.`,
      path: '/study',
      tag: 'streak',
    };
  }

  if (stats.dueNow > 0) {
    return {
      title: 'Time for today’s review',
      body: `${stats.dueNow} card${stats.dueNow === 1 ? ' is' : 's are'} due right now.`,
      path: '/study',
      tag: 'habit',
    };
  }

  return null;
}
