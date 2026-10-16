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
 * than two pushes.
 *
 * A learner who switched a reminder on expects it to arrive (2026-10-16:
 * "reminders say on but never arrive"), so a learner with nothing due still
 * gets a plain nudge to plant words, unless they already studied today. The
 * text follows the learner's app language (`profiles.ui_locale`).
 */

export interface ReminderStats {
  dueNow: number;
  leechCount: number;
  currentStreakDays: number;
  /** True when the learner already reviewed something today (their local day). */
  studiedToday?: boolean;
  /** `profiles.ui_locale` (en-SG, en-US, vi-VN, zh-CN); anything else is English. */
  locale?: string | null;
}

export interface ReminderPayload {
  title: string;
  body: string;
  /** Path, not a full URL — NotificationProcessor prefixes it with `frontendUrl`. */
  path: string;
  tag: 'leech' | 'streak' | 'habit' | 'nudge';
}

type Lang = 'en' | 'vi' | 'zh';

function langOf(locale: string | null | undefined): Lang {
  if (locale?.startsWith('vi')) return 'vi';
  if (locale?.startsWith('zh')) return 'zh';
  return 'en';
}

const words = (n: number) => `${n} word${n === 1 ? '' : 's'}`;

const COPY: Record<
  Lang,
  Record<ReminderPayload['tag'], (n: number, days: number) => [string, string]>
> = {
  en: {
    leech: (n) => [
      'A few words keep tripping you up',
      `${words(n)} need${n === 1 ? 's' : ''} a quick fix. 3 minutes, tops.`,
    ],
    streak: (n, days) => [
      `Don't lose your ${days}-day streak`,
      `${words(n)} ${n === 1 ? 'is' : 'are'} thirsty. Water them to keep it going.`,
    ],
    habit: (n) => [
      'Time to water your garden',
      `${words(n)} ${n === 1 ? 'is' : 'are'} ready to review.`,
    ],
    nudge: () => ['Your garden is waiting', 'Take a few minutes today to plant some new words.'],
  },
  vi: {
    leech: (n) => ['Vài từ cứ làm khó bạn', `${n} từ cần ôn nhanh, chỉ 3 phút thôi.`],
    streak: (n, days) => [
      `Giữ chuỗi ${days} ngày của bạn`,
      `${n} từ đang khát nước. Tưới ngay để giữ chuỗi nhé.`,
    ],
    habit: (n) => ['Đến giờ tưới vườn rồi', `${n} từ đã sẵn sàng để ôn.`],
    nudge: () => ['Khu vườn đang chờ bạn', 'Dành vài phút hôm nay để gieo thêm từ mới nhé.'],
  },
  zh: {
    leech: (n) => ['有几个单词总是记不住', `${n} 个单词需要快速巩固，最多 3 分钟。`],
    streak: (n, days) => [`别让 ${days} 天的连续记录中断`, `${n} 个单词缺水了，浇浇水继续保持吧。`],
    habit: (n) => ['该给花园浇水了', `${n} 个单词可以复习了。`],
    nudge: () => ['你的花园在等你', '今天花几分钟，种下几个新单词吧。'],
  },
};

const PATHS: Record<ReminderPayload['tag'], string> = {
  leech: '/quiz?mode=leech',
  streak: '/review',
  habit: '/review',
  nudge: '/garden',
};

function payload(stats: ReminderStats, tag: ReminderPayload['tag'], n: number): ReminderPayload {
  const [title, body] = COPY[langOf(stats.locale)][tag](n, stats.currentStreakDays);
  return { title, body, path: PATHS[tag], tag };
}

/**
 * Returns `null` only when the learner has nothing due and already studied
 * today.
 *
 * Priority: leech drill (FR-6.4) > streak protection (FR-6.3) > plain daily
 * habit (FR-6.1) > a nudge to plant. Leeches outrank streak protection
 * because a leech alert is actionable in under 3 minutes (BRD's own framing)
 * and directly reduces future leech growth; streak protection is otherwise
 * just a more urgent restatement of "you have words due."
 */
export function buildReminderPayload(stats: ReminderStats): ReminderPayload | null {
  if (stats.leechCount > 0) return payload(stats, 'leech', stats.leechCount);
  if (stats.dueNow > 0 && stats.currentStreakDays > 0)
    return payload(stats, 'streak', stats.dueNow);
  if (stats.dueNow > 0) return payload(stats, 'habit', stats.dueNow);
  if (stats.studiedToday) return null;
  return payload(stats, 'nudge', 0);
}
