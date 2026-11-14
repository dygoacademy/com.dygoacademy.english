/**
 * Paths for the Word Garden screens (docs/plans/archive/ui rebuild implementation plan.md).
 *
 * UI-8 U8-5 (decision 1): the final short URLs. `/garden` stays the home;
 * the other screens moved up from `/garden/<x>` to `/<x>`, and
 * middleware.ts redirects the old `/garden/<x>` paths permanently (see
 * LEGACY_GARDEN_SEGMENTS in constants/routes.ts). The dev pages (_tokens,
 * _gallery) stay under /garden.
 */
export const GARDEN_ROUTES = {
  /** Today's Garden (A1), Welcome back (A5) after 2+ missed days, or All watered (A1b). */
  home: '/garden',
  /**
   * Flag-only token/type test page (UI-1). The folder is `%5Ftokens`
   * because a leading underscore marks a private, non-routable folder in
   * the App Router; `%5F` is Next's documented escape for a URL segment
   * that really starts with `_`.
   */
  tokens: '/garden/_tokens',
  /** Flag-only component gallery (UI-2); folder `%5Fgallery`, same reason. */
  gallery: '/garden/_gallery',
  /**
   * Phase 13 T3 dev page (record → replay → envelope, `.m4a` vs `.wav`
   * offset) for Dylan's iPhone check; folder `%5Fspeaking`, same reason.
   * Signed-in only (not in PUBLIC_GARDEN_DEV_PREFIXES).
   */
  speakingDev: '/garden/_speaking',
  /** A2 Review (watering) and A3 Mission complete. */
  review: '/review',
  /**
   * A2 for the "Plant new words" mission: only never-reviewed words,
   * `count` of them; from one bed when `topicId` is given (A1b extras).
   */
  plant: (count: number, topicId?: string) =>
    `/review?new=${Math.max(1, Math.round(count))}${topicId ? `&topic=${encodeURIComponent(topicId)}` : ''}`,
  /**
   * A2 for one bed's due words only (A7 "Water N due"): reviewed words,
   * never its seeds, which "Plant N new" sows instead.
   */
  waterBed: (topicId: string) => `/review?topic=${encodeURIComponent(topicId)}&due=1`,
  /** A2 with only the `count` most overdue due words (A5b "Quick start"). */
  reviewFirst: (count: number) => `/review?limit=${Math.max(1, Math.round(count))}`,
  reviewDone: '/review/done',
  /** A4 Weekly harvest. */
  missions: '/missions',
  /** A6 Topics and A7 Topic bed. */
  topics: '/topics',
  /** Seeds & Harvest S2: a bed with nothing left to plant. */
  bedHarvest: (id: string) => `/topics/${encodeURIComponent(id)}/harvest`,
  /** Seeds & Harvest S3: pick the next bed after harvesting `id`. */
  seedPackets: (id: string) => `/topics/${encodeURIComponent(id)}/packets`,
  /**
   * Seeds & Harvest S1: the seeds fruit word `droppedBy` dropped into bed
   * `id`; Later and ✕ go to `next` (the session's Mission complete), else home.
   */
  seedDrop: (id: string, droppedBy: string, next?: string) =>
    `/topics/${encodeURIComponent(id)}/seeds?word=${encodeURIComponent(droppedBy)}${next ? `&next=${encodeURIComponent(next)}` : ''}`,
  /** A2 for S1 "Plant them now": only the seeds `droppedBy` dropped. */
  plantSeeds: (droppedBy: string, count: number) =>
    `/review?new=${Math.max(1, Math.round(count))}&seeds=${encodeURIComponent(droppedBy)}`,
  /** A6b: search topics. */
  topicsSearch: '/topics/search',
  topic: (id: string) => `/topics/${encodeURIComponent(id)}`,
  /** A7c: search this bed's words (`q` prefills the field). */
  topicSearch: (id: string, q?: string) =>
    `/topics/${encodeURIComponent(id)}/search${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  /**
   * Garden quiz (U5-5/6): a bed's quiz, or the leech drill back to that bed.
   * `questions` sets the quiz length (the QUIZ mission's, from the daily goal).
   */
  quiz: (topicId?: string, mode?: 'leech', questions?: number) => {
    const params = new URLSearchParams();
    if (topicId) params.set('topic', topicId);
    if (mode) params.set('mode', mode);
    if (questions) params.set('n', String(Math.max(1, Math.round(questions))));
    const query = params.toString();
    return query ? `/quiz?${query}` : '/quiz';
  },
  /** A8 Me. */
  me: '/me',
  /** A8e Privacy & data (voice donation; 404 unless NEXT_PUBLIC_VOICE_DONATION). */
  privacy: '/me/privacy',
  /** A8c Reminder: one ripening reminder (time, Smart time, days, channels). */
  reminder: '/me/reminder',
  /** A8b Daily goal: the three pots (5 / 10 / 15 min). */
  goal: '/me/goal',
  /** A8d Meanings in: the review card's meaning language and Recall first. */
  meanings: '/me/meanings',
  /**
   * Onboarding OB1 About you → OB4 Reminder → OB5 All set (design
   * changelog, page "Adult · Onboarding", 2026-10-12): after AU2 Create
   * account, before the first garden. The garden home sends a learner
   * whose `profiles.onboarded_at` is null to OB1.
   */
  welcome: {
    level: '/welcome/level',
    /** Old OB2 / OB3 steps (removed 2026-10-11): they only redirect now. */
    goal: '/welcome/goal',
    bed: '/welcome/bed',
    reminder: '/welcome/reminder',
    ready: '/welcome/ready',
  },
  /**
   * Phase 13 (phase/phase 13/PHASE-13-RECORD.md): The Pond, five sentences said out
   * loud. Reached from the Missions tab card. The Sound patch drills would
   * be a second part of this page; not built (not in this phase's run).
   */
  sounds: '/sounds',
  /**
   * The speaking flow from an entry point (SE2 / SE5 / SE6): one bed's Pond
   * (`topic`), one word (`word`, the Echo challenge) or several words in a
   * row (`words`); `back` is where Close and the last Next go.
   */
  speak: (opts: {
    topic?: string;
    word?: string;
    words?: readonly string[];
    back?: string;
  }) => {
    const params = new URLSearchParams();
    if (opts.topic) params.set('topic', opts.topic);
    if (opts.word) params.set('word', opts.word);
    if (opts.words?.length) params.set('words', opts.words.join(','));
    if (opts.back) params.set('back', opts.back);
    const query = params.toString();
    return query ? `/sounds?${query}` : '/sounds';
  },
  /**
   * Pronunciation "Stepping stones" (P1–P4): say the words one at a time
   * ("Bee 1 of 3"), from "Bees are waiting" on a bed (Say all: every bee). `topic` names
   * the bed in the iPad header; `back` is where Close and the last
   * "Back to the bed" go.
   */
  pronounce: (opts: { words: readonly string[]; topic?: string; back?: string }) => {
    const params = new URLSearchParams();
    params.set('words', opts.words.join(','));
    if (opts.topic) params.set('topic', opts.topic);
    if (opts.back) params.set('back', opts.back);
    return `/sounds/word?${params.toString()}`;
  },
  /** UI-G shared gardens: GR1 list, GR2 a garden, GR3/GR4 tend (admins), GR6 join. */
  groups: '/groups',
  group: (id: string) => `/groups/${encodeURIComponent(id)}`,
  groupManage: (id: string, tab: 'tricky' | 'gardeners' = 'tricky') =>
    `/groups/${encodeURIComponent(id)}/manage${tab === 'gardeners' ? '?tab=gardeners' : ''}`,
  join: (token: string) => `/join/${encodeURIComponent(token)}`,
} as const;

export const GARDEN_PATH_PREFIX = '/garden';

/**
 * iPad navigation (UI-3 U3-2): the side rail at `medium` (600–1023px) and the
 * sidebar at `expanded` (≥ 1024px) in place of the bottom tab bar. Off unless
 * NEXT_PUBLIC_GARDEN_IPAD_NAV is the literal "true"; UI-7 turns it on with
 * the iPad layouts. Below 600px the tab bar is unchanged either way.
 */
export function isGardenIpadNavOn(
  value: string | undefined = process.env.NEXT_PUBLIC_GARDEN_IPAD_NAV,
): boolean {
  return value === 'true';
}
