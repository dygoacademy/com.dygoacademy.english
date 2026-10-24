import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../../database/database.service';
import { recordEvent } from '../beds/product-events';
import { dropSeeds, type DroppedSeed } from '../beds/seed-drops';
import {
  MissionClient,
  localDateOf,
  newWordAllowance,
  recordMissionProgress,
} from '../missions/missions.store';
import { STREAK_FREEZES_MAX } from '../missions/weekly.plan';
import { recordRescue, settleWeek, weeklySafely } from '../missions/weekly.store';
import { RateWordDto } from './dto/rate-word.dto';
import { SessionMode, StartSessionDto } from './dto/start-session.dto';
import { SyncReviewItemDto, SyncReviewsDto } from './dto/sync-reviews.dto';
import {
  FsrsCardState,
  FsrsStateName,
  LEECH_THRESHOLD,
  LEECH_WINDOW_DAYS,
  SrsRating,
  RatingInterval,
  computeRatingIntervals,
  newCard,
  nextMasteredAt,
  retrievability,
  schedule,
} from './fsrs-scheduler';
import {
  GradedQuizType,
  ReviewSource,
  decideGrading,
  gradeFlashcard,
  gradeQuizAnswer,
} from './grading';

/** A due (or new) card, joined with its enriched lexicon content for study. */
export interface DueCard {
  topic_word_id: string;
  topic_id: string;
  source_word: string;
  part_of_speech: string | null;
  ipa_us: string | null;
  ipa_uk: string | null;
  definition_en: string | null;
  audio_url: string | null;
  synonyms: unknown;
  antonyms: unknown;
  example_sentences: unknown;
  /**
   * The review card's meaning-language line (design system §14.8),
   * translated from `definition_en`/the first `example_sentences` entry by
   * the same enrichment pass that fills `definition_en` (`word_translations`,
   * joined to whichever locale the caller's `profiles.meaning_locale` is
   * set to). Null when meaning_locale is unset (English only) or Gemini
   * hasn't translated this particular word into it yet.
   */
  meaning_locale: 'vi-VN' | 'zh-CN' | null;
  meaning_translation: string | null;
  meaning_example_translation: string | null;
  /** True if this word has never been reviewed — no `user_word_srs` row yet (FR-4.2's "new card"). */
  is_new: boolean;
  /** Phase 10 — FSRS memory state. See fsrs-scheduler.ts. */
  state: FsrsStateName;
  stability: number | null;
  difficulty: number | null;
  reps: number;
  lapses: number;
  /** FSRS learning/relearning step index (0 for new cards); feeds the interval previews. */
  learning_steps: number;
  scheduled_days: number;
  last_reviewed_at: Date | null;
  /** Recall probability right now (0–1); null for a new card. Computed at read time. */
  retrievability: number | null;
  is_mastered: boolean;
  is_leech: boolean;
  next_due_at: Date | null;
  /**
   * UI-4 — Next-due interval per rating. Shows "< 1 min", "5 days", etc.
   * under each rating button on the Watering Page (A2 · Review). Computed
   * by ts-fsrs's repeat() for each grade (Again/Hard/Good/Easy); null when
   * the intervals cannot be computed.
   */
  interval_preview: Record<SrsRating, RatingInterval> | null;
}

export interface RateWordResult {
  topic_word_id: string;
  /**
   * The rating actually applied — can differ from what was submitted: a
   * correct quiz answer is graded by quiz type (grading.ts), and a flashcard
   * EASY on a never-seen word counts as GOOD.
   */
  rating: SrsRating;
  /**
   * Phase 10 — false when this review was logged but did not move the
   * schedule (a success on a word that wasn't due, or a second mistake on
   * the same word in the same local day). The fields below then describe
   * the word's unchanged state.
   */
  graded: boolean;
  state: FsrsStateName;
  stability: number | null;
  difficulty: number | null;
  reps: number;
  lapses: number;
  scheduled_days: number;
  is_leech: boolean;
  is_mastered: boolean;
  was_correct: boolean;
  next_due_at: Date;
  /**
   * Phase 9, "Session Mastery Count" (`phase 9 implementation plan.md`) --
   * true exactly when *this* rating made the word mastered (Phase 10:
   * `mastered_at` went from null to set, see fsrs-scheduler.ts's
   * `nextMasteredAt`), not merely whether the word is currently
   * mastered -- a word already at or above the threshold, rated again,
   * is not "just" mastered. The frontend accumulates this into a
   * per-session count for the reward-hero's "+N mastered" line; no new
   * endpoint or persisted aggregate needed, the information already
   * passes through this existing per-card round trip.
   */
  just_mastered: boolean;
  /** Seeds & Harvest: seeds this review's new fruit dropped (S1 shows them). */
  seeds_dropped: number;
}

export interface LeechCard {
  topic_word_id: string;
  topic_id: string;
  source_word: string;
  recent_mistakes: number;
  total_mistakes: number;
  next_due_at: Date;
}

export interface SrsStats {
  total_words: number;
  mastered_words: number;
  due_now: number;
  leech_count: number;
  current_streak_days: number;
  /**
   * Phase 9, Home greeting personalization ("check the topic design
   * mockup, that look like haven't implement the indicate yet" ->
   * mockup's "GOOD EVENING, SARAH") -- `public.profiles.display_name`
   * for the caller, null for the common case (real registrations never
   * collect one; only hand-seeded fixture accounts like Sarah's have
   * one). Folded into this existing per-load query rather than a new
   * endpoint, since Home already calls `useSrsStats()` on every visit.
   */
  display_name: string | null;
  /**
   * UI-4 U4-2: the garden's per-stage word counts, same rule as the
   * frontend's `stageFromSrs` (mastered wins; leeches stay in their stage).
   * `new` = READY words visible to the caller with no `user_word_srs` row,
   * plus rows still in `fsrs_state = 'New'`; `learning` = Learning +
   * Relearning; `review` = Review with `mastered_at is null`; `mastered` =
   * `mastered_at is not null` (equals `mastered_words`).
   */
  stage_counts: SrsStageCounts;
  /**
   * UI-6 U6-3: streak freezes (decision 7) -- 2 a week, refilled to at least 2
   * on the learner's local Monday (A4's weekly reward can make it 3), one used automatically per missed day while the
   * whole current gap can be covered. `refills_on` = next local Monday.
   */
  freezes: SrsFreezes;
  /** UI-6 U6-3: longest streak in the loaded history (frozen days bridge). */
  best_streak_days: number;
  /**
   * Me's "in the garden": whole minutes spent learning, all time (see
   * `computeGardenMinutes`). Only `GET /srs/stats` fills it; the
   * NotificationProcessor's summary leaves it out.
   */
  garden_minutes?: number;
}

export interface SrsFreezes {
  available: number;
  used_this_week: number;
  refills_on: string;
}

export interface SrsStageCounts {
  new: number;
  learning: number;
  review: number;
  mastered: number;
}

/**
 * Phase 9, "Vocabulary Mastery Tier Ladder" (`phase 9 implementation
 * plan.md`) -- replaces an invented decimal "estimated IELTS band" (the
 * exact thing Phase 7's Module 20 was shelved over for lacking a credible
 * methodology) with a checkable claim: "you've mastered N of M words in
 * this tier's collection." `tier`/`tierName` describe the tier the caller
 * is *currently progressing through* (the first not-yet-cleared tier, or
 * the last tier if every tier is cleared) -- not the last tier they
 * finished. `nextTierName`/`wordsToNextTier` are both null once every tier
 * is cleared; there is nothing further to progress toward.
 */
export interface TierProgress {
  tier: number;
  tierName: string;
  masteredInTier: number;
  wordsInTier: number;
  nextTierName: string | null;
  wordsToNextTier: number | null;
}

/**
 * The tier→topic mapping is server-side config, not something the client
 * should hardcode (Home and Analytics both read `GET /srs/tier-progress`
 * so they can't disagree -- same rule Phase 6 FR-9.1/9.2/9.3 already
 * fixed once for streak/due-count, not something to re-break with a third
 * source of truth).
 *
 * These 4 topic ids are `database/seeds/02_tier_ladder.sql`'s
 * test dataset, live-directed 2026-09-20 ("Let's map tiers to topics
 * ourselves for now" / "You can build test dataset by yourself") to
 * unblock this feature rather than wait on a real curriculum decision --
 * see that migration's own header. **Swap these for real production topic
 * ids once an actual curriculum decision is made; don't ship this array
 * as the permanent mapping.** A `tier` column on `topics` (via migration)
 * is the cleaner long-term answer if more than 4 tiers, or per-group
 * customization, ever comes up -- a hardcoded array is enough for one
 * global ladder against a known, fixed set of ids.
 */
const TIER_TOPICS: { tier: number; tierName: string; topicId: string }[] = [
  { tier: 1, tierName: 'Foundation', topicId: 'c9c9c9c9-0000-0000-0000-000000000001' },
  { tier: 2, tierName: 'Core Vocabulary', topicId: 'c9c9c9c9-0000-0000-0000-000000000002' },
  { tier: 3, tierName: 'Band 6.5 Ready', topicId: 'c9c9c9c9-0000-0000-0000-000000000003' },
  { tier: 4, tierName: 'Band 7.5 Ready', topicId: 'c9c9c9c9-0000-0000-0000-000000000004' },
];

export interface SessionResult {
  mode: SessionMode;
  cards: DueCard[];
}

export interface SyncItemResult {
  topicWordId: string;
  status: 'applied' | 'error';
  result?: RateWordResult;
  error?: string;
}

/** One day's review count (Phase 3 Module 18, FR-18.1's activity trail). */
export interface DailyActivity {
  review_date: string;
  review_count: number;
}

/**
 * Phase 9, "Upcoming Path" -- the forward-looking counterpart to
 * `DailyActivity` above. Deliberately a separate interface, not a shared
 * `direction` param on the same route/shape: the fields mean different
 * things (a count of *already-happened* reviews vs. a count of words
 * *currently scheduled* to come due), and `due_count` is explicitly a
 * projection, not a commitment -- see `getUpcomingActivity`'s own
 * comment for why.
 */
export interface UpcomingActivity {
  due_date: string;
  due_count: number;
}

const DUE_CARD_COLUMNS = `
  tw.id as topic_word_id,
  tw.topic_id,
  tw.source_word,
  ml.part_of_speech,
  ml.ipa_us,
  ml.ipa_uk,
  ml.definition_en,
  ml.audio_url,
  ml.synonyms,
  ml.antonyms,
  ml.example_sentences,
  wt.locale as meaning_locale,
  wt.meaning as meaning_translation,
  wt.example_translation as meaning_example_translation
`;

// Joined by auth.uid() rather than a bound $userId param: findDue's own
// SQL never took a userId parameter (RLS already scopes every row via
// queryAs's JWT claims), so this keeps that shape instead of threading a
// new param through both queries' positional $1/$2 lists. One indexed
// profiles lookup by primary key, same cost class as resolveUserTimezone's.
/**
 * The caller's active bed (Seeds & Harvest: `user_beds` status active, the
 * bed picked from a seed packet), else their first bed (picked from their
 * goal at onboarding), else the bed of the word they planted last (a
 * learner who never had either, e.g. signed up before onboarding); null
 * for learners who never planted a library word. By auth.uid()
 * for the same reason as MEANING_TRANSLATION_JOIN below. Also used by Quiz
 * and Speaking to keep practice on the learner's own words.
 */
export const ACTIVE_BED_TOPIC =
  `coalesce((select ub.topic_id from public.user_beds ub where ub.user_id = auth.uid() and ub.status = 'active'), ` +
  `(select p.first_topic_id from public.profiles p where p.id = auth.uid()), ` +
  `(select lb.topic_id from public.user_word_srs lu join public.topic_words lb on lb.id = lu.topic_word_id ` +
  `join public.topics lt on lt.id = lb.topic_id where not lt.is_my_words order by lu.created_at desc limit 1))`;

// New cards, findDue without a topic (Seeds & Harvest Phase 2, planting
// order): words the learner added themselves (they chose them, and library
// words are always older, so oldest-first alone planted them last), then
// their active bed's own words, then seeds dropped into the active bed,
// then other dropped seeds, then the oldest words anywhere. A dropped seed
// sits in My words with added_by = the learner, so it is checked first.
// `is not distinct from` keeps the tests false, never null, when the
// learner has no bed (added_by can be null too).
const PLANTING_ORDER = `case
           when exists (select 1 from public.seed_drops sd
                         where sd.topic_word_id = tw.id and sd.bed_topic_id = ${ACTIVE_BED_TOPIC}) then 2
           when exists (select 1 from public.seed_drops sd where sd.topic_word_id = tw.id) then 3
           when tw.added_by is not distinct from auth.uid() then 0
           when tw.topic_id is not distinct from ${ACTIVE_BED_TOPIC} then 1
           else 4 end`;

const MEANING_TRANSLATION_JOIN = `
  left join public.word_translations wt
         on wt.word_id = ml.id
        and wt.locale = (select p.meaning_locale from public.profiles p where p.id = auth.uid())
`;

/**
 * Module 3 — Error-adaptive spaced repetition (Phase 2). See
 * `fsrs-scheduler.ts` (FSRS math) and `grading.ts` (what counts) for the scoring rules; this class owns the DB
 * transactions and RLS scoping (same split, and the same `queryAs`/`withUser`
 * pattern, as `TopicsService`).
 */
@Injectable()
export class SrsService {
  private readonly logger = new Logger(SrsService.name);

  constructor(
    protected readonly db: DatabaseService,
    // Optional so unit tests and tools that build SrsService alone need no config.
    @Optional() private readonly config?: ConfigService,
  ) {}

  /**
   * FR-3.4's due-card queue: existing `user_word_srs` rows past their
   * `next_due_at`, **plus** never-reviewed `READY` words in scope (FR-4.2
   * calls these "new cards" implicitly — there is no separate new-card
   * table, so "no `user_word_srs` row yet" is the definition used here).
   *
   * Two queries, not a `UNION` / outer join, for the same reason
   * `TopicsService.findById` keeps topic and word queries separate: either
   * can be empty without complicating the other's shape, and the "existing
   * due" query is the one carrying the p95 < 15ms budget (FR-3.4) — it
   * should not pay for a second table's worth of join/filter logic.
   *
   * `newOnly` skips the existing-due query: the home screen's "Plant new
   * words" mission starts a session of never-reviewed words only.
   *
   * Without a topic, new cards come from words the learner added
   * themselves first, then from their active bed (`ACTIVE_BED_TOPIC`: the
   * seed packet they picked, else the first bed onboarding picked from
   * their goal), so the daily mission plants what they chose, then keeps
   * to their bed; once both have no seeds left, the oldest words anywhere
   * follow (the garden offers S2 Bed harvest before that).
   *
   * `newCap` caps the new cards (daily goal missions: a session plants at
   * most what is left of today's Plant mission; 0 = due reviews only).
   *
   * `seedsOf` (Seeds & Harvest S1 "Plant them now"): only the unplanted
   * seeds that fruit word dropped; no due reviews, no topic.
   */
  async findDue(
    userId: string,
    topicId?: string,
    limit = 50,
    newOnly = false,
    newCap = Number.POSITIVE_INFINITY,
    seedsOf?: string,
  ): Promise<DueCard[]> {
    if (seedsOf) {
      topicId = undefined;
      newOnly = true;
    }
    const dueExisting = newOnly
      ? []
      : await this.db.queryAs<DueCard>(
          userId,
          `select ${DUE_CARD_COLUMNS},
              false as is_new,
              uws.fsrs_state as state, uws.stability, uws.difficulty,
              uws.reps, uws.lapses, uws.learning_steps, uws.scheduled_days, uws.last_reviewed_at,
              (uws.mastered_at is not null) as is_mastered,
              uws.is_leech, uws.next_due_at
         from public.user_word_srs uws
         join public.topic_words tw on tw.id = uws.topic_word_id
         left join public.master_lexicon ml on ml.id = tw.lexicon_id
         ${MEANING_TRANSLATION_JOIN}
        where uws.next_due_at <= now()
          ${topicId ? 'and tw.topic_id = $1' : ''}
        order by uws.next_due_at asc
        limit ${topicId ? '$2' : '$1'}`,
          topicId ? [topicId, limit] : [limit],
        );

    const now = new Date();
    const remaining = Math.max(0, Math.min(limit - dueExisting.length, newCap));
    if (remaining === 0) {
      return withRetrievability(dueExisting, now);
    }

    // "not exists" against user_word_srs is still RLS-scoped to this caller
    // (every scan of that table carries the policy, regardless of clause
    // shape — see TopicsService.findAllVisible's comment for the same point),
    // so no explicit user_id predicate is needed here.
    const newCards = await this.db.queryAs<DueCard>(
      userId,
      `select ${DUE_CARD_COLUMNS},
              true as is_new,
              -- Cast explicitly so both branches' rows have the same JS shape
              -- (an un-cast numeric literal comes back from pg as a string).
              'New'::text as state, null::real as stability, null::real as difficulty,
              0 as reps, 0 as lapses, 0 as learning_steps, 0::real as scheduled_days,
              null::timestamptz as last_reviewed_at, false as is_mastered,
              false as is_leech, null::timestamptz as next_due_at
         from public.topic_words tw
         left join public.master_lexicon ml on ml.id = tw.lexicon_id
         ${MEANING_TRANSLATION_JOIN}
        where tw.status = 'READY'
          and not exists (
            select 1 from public.user_word_srs uws where uws.topic_word_id = tw.id
          )
          ${topicId ? 'and tw.topic_id = $1' : ''}
          ${seedsOf ? 'and tw.id in (select sd.topic_word_id from public.seed_drops sd where sd.dropped_by = $2)' : ''}
        order by ${topicId ? '' : `${PLANTING_ORDER}, `}tw.created_at asc
        limit ${topicId ? '$2' : '$1'}`,
      topicId ? [topicId, remaining] : seedsOf ? [remaining, seedsOf] : [remaining],
    );

    return withRetrievability([...dueExisting, ...newCards], now);
  }

  /**
   * FR-3.2 — a flashcard rating from `/study` (or an offline replay via
   * `sync()`). Self-ratings count at face value except EASY on a
   * never-seen word, which counts as GOOD (grading.ts).
   */
  async rate(
    userId: string,
    dto: RateWordDto,
    now: Date = new Date(),
    source: ReviewSource = 'flashcard',
  ): Promise<RateWordResult> {
    return this.applyReview(
      userId,
      {
        topicWordId: dto.topicWordId,
        responseMs: dto.responseMs,
        source,
        quizType: null,
        hintUsed: false,
        gradeFor: (isNewCard) => gradeFlashcard(dto.rating, isNewCard),
        countsForReviewMissions: true,
      },
      now,
    );
  }

  /**
   * Phase 10, Workstream 3 — a graded quiz answer feeds the same schedule
   * flashcards do. Wrong = AGAIN; correct recognition (MATCHING,
   * CONTEXTUAL_CHOICE) = HARD; correct recall (CLOZE, DICTATION) = GOOD; a
   * hint caps at HARD. Whether it actually moves the schedule is decided by
   * the shared rules in `applyReview` (grading.ts's `decideGrading`).
   */
  async recordQuizResult(
    userId: string,
    input: {
      topicWordId: string;
      quizType: GradedQuizType;
      correct: boolean;
      hintUsed: boolean;
      responseMs?: number;
      source?: 'quiz' | 'leech_drill';
      /** UI-6 U6-2: the last answer of a quiz — counts toward the QUIZ mission. */
      quizFinished?: boolean;
    },
    now: Date = new Date(),
  ): Promise<RateWordResult> {
    const rating = gradeQuizAnswer(input);
    return this.applyReview(
      userId,
      {
        topicWordId: input.topicWordId,
        responseMs: input.responseMs,
        source: input.source ?? 'quiz',
        quizType: input.quizType,
        hintUsed: input.hintUsed,
        gradeFor: () => rating,
        quizFinished: input.quizFinished === true,
      },
      now,
    );
  }

  /**
   * One review, one transaction: read current state → resolve the learner's
   * day → count graded mistakes → decide whether this review grades →
   * insert the `review_logs` row (always, graded or not) → upsert
   * `user_word_srs` (only when graded). All steps need the same snapshot and
   * must land atomically, which `queryAs` (single-statement) can't give.
   */
  private async applyReview(
    userId: string,
    input: {
      topicWordId: string;
      responseMs?: number;
      source: ReviewSource;
      quizType: GradedQuizType | null;
      hintUsed: boolean;
      gradeFor: (isNewCard: boolean) => SrsRating;
      /** UI-6 U6-2: flashcard reviews bump REVIEW_DUE / LEARN_NEW. */
      countsForReviewMissions?: boolean;
      quizFinished?: boolean;
    },
    now: Date,
  ): Promise<RateWordResult> {
    let seeds: DroppedSeed[] = [];
    const result = await this.db.withUser(userId, async (client) => {
      // Confirms the word exists and is readable (topic_words_select via
      // can_read_topic) before doing anything else — a bad/foreign
      // topicWordId should 404, not silently no-op through the upsert below.
      const wordRows = await client.query<{ id: string }>(
        `select id from public.topic_words where id = $1`,
        [input.topicWordId],
      );
      if (wordRows.rows.length === 0) {
        throw new NotFoundException('Word not found.');
      }

      const stateRows = await client.query<SrsStateRow>(
        `select fsrs_state, stability, difficulty, reps, lapses, learning_steps,
                scheduled_days, last_reviewed_at, next_due_at, mastered_at, is_leech
           from public.user_word_srs
          where topic_word_id = $1`,
        [input.topicWordId],
      );
      const existing = stateRows.rows[0];
      const isNewCard = !existing;
      const current: FsrsCardState = existing ? rowToCard(existing) : newCard(now);
      const masteredBefore = existing?.mastered_at ? new Date(existing.mastered_at) : null;

      // "Today" is the learner's local day, same resolver the streak uses.
      const timezone = await resolveUserTimezone(
        async <T extends Record<string, unknown>>(text: string, params: unknown[]) =>
          (await client.query<T>(text, params)).rows,
        userId,
      );

      // Graded mistakes only: an ungraded repeat mistake (same word, same
      // day) never counts toward the FR-3.3 leech window.
      const mistakeRows = await client.query<{ recent: string; today: string }>(
        `select count(*) as recent,
                count(*) filter (
                  where (reviewed_at at time zone $3)::date = ($2::timestamptz at time zone $3)::date
                ) as today
           from public.review_logs
          where topic_word_id = $1
            and rating = 'AGAIN'
            and graded
            and reviewed_at >= $2::timestamptz - ($4 || ' days')::interval`,
        [input.topicWordId, now.toISOString(), timezone, LEECH_WINDOW_DAYS],
      );
      const recentMistakesBefore = Number(mistakeRows.rows[0]?.recent ?? 0);
      const lapseAlreadyCountedToday = Number(mistakeRows.rows[0]?.today ?? 0) > 0;

      const rating = input.gradeFor(isNewCard);
      const decision = decideGrading({
        rating,
        isNewCard,
        isDue: current.dueAt.getTime() <= now.getTime(),
        lapseAlreadyCountedToday,
      });

      const outcome = decision.graded ? schedule(current, rating, now) : null;
      const after = outcome?.card ?? current;
      const elapsedDays =
        outcome?.elapsedDays ??
        (current.lastReviewAt
          ? Math.max(0, (now.getTime() - current.lastReviewAt.getTime()) / 86_400_000)
          : null);

      await client.query(
        `insert into public.review_logs
           (user_id, topic_word_id, rating, was_correct, response_ms, reviewed_at,
            source, quiz_type, hint_used, graded, state_before, elapsed_days,
            scheduled_days, stability_after, difficulty_after)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          userId,
          input.topicWordId,
          rating,
          rating !== 'AGAIN',
          input.responseMs ?? null,
          now.toISOString(),
          input.source,
          input.quizType,
          input.hintUsed,
          decision.graded,
          current.state,
          elapsedDays,
          current.scheduledDays,
          after.stability,
          after.difficulty,
        ],
      );

      // UI-6 U6-2: daily mission progress, in this same transaction. A graded
      // flashcard review counts as LEARN_NEW when the card was new, else
      // REVIEW_DUE; a finished quiz counts as QUIZ.
      const missionClient = client as unknown as MissionClient;
      const wasDue = !isNewCard && current.dueAt.getTime() <= now.getTime();
      // Runs after the schedule writes, so `wasDue` re-adds this card to the
      // due count if today's rows are created right here.
      const recordMissions = async (graded: boolean): Promise<void> => {
        const extraDue = wasDue ? 1 : 0;
        if (input.countsForReviewMissions && graded) {
          const type = isNewCard ? 'LEARN_NEW' : 'REVIEW_DUE';
          await recordMissionProgress(missionClient, userId, timezone, now, type, extraDue);
        }
        if (input.quizFinished) {
          await recordMissionProgress(missionClient, userId, timezone, now, 'QUIZ', extraDue);
        }
        // A4 weekly missions: a wilting word answered right in the leech drill
        // is rescued (once a week), which may finish the week (+1 rain barrel).
        // Flashcard reviews ("Water 20 words") are counted on A4's next read.
        if (input.source === 'leech_drill' && existing?.is_leech === true && rating !== 'AGAIN') {
          await weeklySafely(
            missionClient,
            async () => {
              await recordRescue(missionClient, userId, timezone, now, input.topicWordId);
              await settleWeek(missionClient, userId, timezone, now);
            },
            (err) => this.logger.warn(`weekly missions: ${String(err)}`),
          );
        }
      };

      if (!outcome) {
        await recordMissions(false);
        // Logged only — the schedule is untouched. `existing` is always set
        // here: a new card always grades (grading.ts).
        return {
          topic_word_id: input.topicWordId,
          rating,
          graded: false,
          state: current.state,
          stability: current.stability,
          difficulty: current.difficulty,
          reps: current.reps,
          lapses: current.lapses,
          scheduled_days: current.scheduledDays,
          is_leech: existing?.is_leech ?? false,
          is_mastered: masteredBefore !== null,
          was_correct: rating !== 'AGAIN',
          next_due_at: current.dueAt,
          just_mastered: false,
          seeds_dropped: 0,
        };
      }

      const mistakeIncrement = rating === 'AGAIN' ? 1 : 0;
      const recentMistakesAfter = recentMistakesBefore + mistakeIncrement;
      const isLeech = recentMistakesAfter >= LEECH_THRESHOLD;
      const masteredAfter = nextMasteredAt(masteredBefore, after, rating, now);

      const upserted = await client.query<{
        fsrs_state: FsrsStateName;
        stability: number | null;
        difficulty: number | null;
        reps: number;
        lapses: number;
        scheduled_days: number;
        is_leech: boolean;
        next_due_at: Date;
        mastered_at: Date | null;
      }>(
        `insert into public.user_word_srs
           (user_id, topic_word_id, fsrs_state, stability, difficulty, reps, lapses,
            learning_steps, scheduled_days, total_mistakes, recent_mistakes, is_leech,
            last_reviewed_at, next_due_at, mastered_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         on conflict (user_id, topic_word_id) do update set
           fsrs_state       = excluded.fsrs_state,
           stability        = excluded.stability,
           difficulty       = excluded.difficulty,
           reps             = excluded.reps,
           lapses           = excluded.lapses,
           learning_steps   = excluded.learning_steps,
           scheduled_days   = excluded.scheduled_days,
           total_mistakes   = public.user_word_srs.total_mistakes + excluded.total_mistakes,
           recent_mistakes  = excluded.recent_mistakes,
           is_leech         = excluded.is_leech,
           last_reviewed_at = excluded.last_reviewed_at,
           next_due_at      = excluded.next_due_at,
           mastered_at      = excluded.mastered_at,
           updated_at       = now()
         returning fsrs_state, stability, difficulty, reps, lapses, scheduled_days,
                   is_leech, next_due_at, mastered_at`,
        [
          userId,
          input.topicWordId,
          after.state,
          after.stability,
          after.difficulty,
          after.reps,
          after.lapses,
          after.learningSteps,
          after.scheduledDays,
          mistakeIncrement,
          recentMistakesAfter,
          isLeech,
          now.toISOString(),
          after.dueAt.toISOString(),
          masteredAfter ? masteredAfter.toISOString() : null,
        ],
      );

      const row = upserted.rows[0];
      await recordMissions(true);
      // Seeds & Harvest Phase 2 (flag `seed_drops`, SEED_DROPS_ENABLED): a
      // word turning fruit drops its seeds into the learner's garden. In a
      // savepoint, so a failed drop never loses the review.
      // Analytics: the first review of a dropped seed plants it ("now" when
      // it comes within the hour after S1 showed it, else the daily planting).
      if (this.seedDropsOn() && isNewCard) {
        const seed = (
          await client.query<{ seen_at: Date | null }>(
            `select seen_at from public.seed_drops where topic_word_id = $1`,
            [input.topicWordId],
          )
        ).rows[0];
        if (seed) {
          const soon = seed.seen_at && now.getTime() - new Date(seed.seen_at).getTime() < 3_600_000;
          await recordEvent(client, 'seed_planted', {
            seed_word_id: input.topicWordId,
            planted_from: soon ? 'now' : 'daily',
          });
        }
      }
      if (this.seedDropsOn() && masteredBefore === null && row.mastered_at !== null) {
        await client.query('savepoint seed_drops');
        try {
          seeds = await dropSeeds(client, userId, input.topicWordId);
          await client.query('release savepoint seed_drops');
        } catch (err) {
          await client.query('rollback to savepoint seed_drops');
          seeds = [];
          this.logger.warn(`seed drop: ${String(err)}`);
        }
      }
      return {
        topic_word_id: input.topicWordId,
        rating,
        graded: true,
        state: row.fsrs_state,
        stability: row.stability,
        difficulty: row.difficulty,
        reps: row.reps,
        lapses: row.lapses,
        scheduled_days: row.scheduled_days,
        is_leech: row.is_leech,
        is_mastered: row.mastered_at !== null,
        was_correct: rating !== 'AGAIN',
        next_due_at: row.next_due_at,
        just_mastered: masteredBefore === null && row.mastered_at !== null,
        seeds_dropped: seeds.length,
      };
    });
    return result;
  }

  /** Seeds & Harvest: the `seed_drops` flag (off unless SEED_DROPS_ENABLED=true). */
  private seedDropsOn(): boolean {
    return this.config?.get<boolean>('seedDrops.enabled', false) ?? false;
  }

  /** FR-3.3 — the remedial queue. Reads the stored `is_leech` flag, not a live aggregate (set in `applyReview`). */
  async findLeeches(userId: string): Promise<LeechCard[]> {
    return this.db.queryAs<LeechCard>(
      userId,
      `select tw.id as topic_word_id, tw.topic_id, tw.source_word,
              uws.recent_mistakes, uws.total_mistakes, uws.next_due_at
         from public.user_word_srs uws
         join public.topic_words tw on tw.id = uws.topic_word_id
        where uws.is_leech = true
        order by uws.recent_mistakes desc, uws.next_due_at asc`,
    );
  }

  /**
   * FR-8.1's per-student view. Delegates to `computeSrsSummary` (below) --
   * see that function's own comment for why this stopped being its own
   * hand-written pair of queries. `detectedTz` is only ever used as a
   * fallback -- see `resolveUserTimezone`'s own comment.
   */
  async stats(userId: string, detectedTz?: string): Promise<SrsStats> {
    const queryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      params: unknown[],
    ) => this.db.queryAs<T>(userId, text, params);
    const timezone = await resolveUserTimezone(queryFn, userId, detectedTz);
    const summary = await computeSrsSummary(queryFn, userId, timezone);
    // After the summary, not inside its Promise.all, so the summary's own
    // query order (and its callers' positional mocks) stays the same.
    const gardenMinutes = await computeGardenMinutes(queryFn, userId);
    return { ...summary, garden_minutes: gardenMinutes };
  }

  /**
   * Phase 3 Module 18 (FR-18.1) — per-day review counts for Home's
   * activity trail. Same table and same `(reviewed_at at time zone
   * 'utc')::date::text` cast `computeSrsSummary`'s streak query already
   * uses below, but grouped with a count instead of collected as a flat
   * distinct-date list -- streak math only needs to know a day happened,
   * a trail needs to know how much happened. RLS-scoped via `queryAs`,
   * same as every other read in this class; no explicit `user_id`
   * predicate beyond the `where` below is needed for RLS itself, but it's
   * kept anyway since it's also what bounds the date range, not just who
   * can see it.
   *
   * `days` is concatenated into the interval literal via a second bound
   * parameter (`($2 || ' days')::interval`) rather than string-interpolated
   * into the query text -- still parameterized, just not a literal
   * Postgres `interval '$2 days'` (which isn't valid syntax; intervals
   * don't accept a bound parameter directly inside the literal).
   */
  async getDailyActivity(userId: string, days = 7, detectedTz?: string): Promise<DailyActivity[]> {
    const timezone = await resolveUserTimezone(
      (text, params) => this.db.queryAs(userId, text, params),
      userId,
      detectedTz,
    );
    // count(*) comes back as a string (Postgres bigint) -- converted to a
    // real number here, same as computeSrsSummary does for due_now/
    // mastered_words/leech_count below, rather than the string-passthrough
    // convention TopicsService uses for its own count()s. Same service,
    // one convention: SrsService's counts are already-converted numbers by
    // the time they leave this file.
    const rows = await this.db.queryAs<{ review_date: string; review_count: string }>(
      userId,
      `select (reviewed_at at time zone $3)::date::text as review_date,
              count(*) as review_count
         from public.review_logs
        where user_id = $1
          and reviewed_at >= now() - ($2 || ' days')::interval
        group by review_date
        order by review_date desc`,
      [userId, days, timezone],
    );
    return rows.map((r) => ({ review_date: r.review_date, review_count: Number(r.review_count) }));
  }

  /**
   * Phase 9, "Upcoming Path" -- the forward-looking sibling to
   * `getDailyActivity` immediately above: same shape (grouped calendar-day
   * counts over a window, RLS-scoped via `queryAs`, gap days left for the
   * frontend to zero-fill -- `ActivityTrail.tsx`'s own comment on why that
   * fill happens client-side, not here, applies equally to
   * `UpcomingPath.tsx`), but grouping `user_word_srs.next_due_at` instead
   * of `review_logs.reviewed_at`, and looking forward instead of back.
   * `user_word_srs.next_due_at` already exists (the SRS engine has always
   * needed it, for `findDue`/`rate` above) -- this is a new query against
   * existing data, not a new "planned curriculum" concept, correcting an
   * earlier overestimate of this feature's scope in the master schedule.
   *
   * Filters on `(next_due_at at time zone 'utc')::date > (now() at time
   * zone 'utc')::date` -- a strict future *calendar day*, not `next_due_at
   * > now()` -- so a word due later today (already counted by `SrsStats.
   * due_now`'s own `next_due_at <= now()` check once it actually comes
   * due) is never double-counted here. "Today" stays `DueNowCard`'s job;
   * this method only ever answers for days after it.
   *
   * The result is a projection, not a commitment: `next_due_at` moves
   * whenever a word is actually reviewed (early, late, or not at all,
   * per fsrs-scheduler.ts), so "Friday: 4 words" describes what's
   * currently scheduled, not a guarantee — the frontend's copy needs to
   * read that way too, not as a fixed plan.
   */
  async getUpcomingActivity(
    userId: string,
    days = 7,
    detectedTz?: string,
  ): Promise<UpcomingActivity[]> {
    const timezone = await resolveUserTimezone(
      (text, params) => this.db.queryAs(userId, text, params),
      userId,
      detectedTz,
    );
    const rows = await this.db.queryAs<{ due_date: string; due_count: string }>(
      userId,
      `select (next_due_at at time zone $3)::date::text as due_date,
              count(*) as due_count
         from public.user_word_srs
        where user_id = $1
          and (next_due_at at time zone $3)::date > (now() at time zone $3)::date
          and next_due_at < now() + ($2 || ' days')::interval
        group by due_date
        order by due_date asc`,
      [userId, days, timezone],
    );
    return rows.map((r) => ({ due_date: r.due_date, due_count: Number(r.due_count) }));
  }

  /**
   * Phase 9, "Vocabulary Mastery Tier Ladder". Same query shape
   * `TopicsService.findAllVisible`'s `mastered_count` already uses
   * (`topics.service.ts:83-84`) -- `count(distinct ...) filter (where
   * uws.mastered_at is not null)` since Phase 10's sticky mastery -- scoped to `TIER_TOPICS`' 4 fixed topic ids
   * instead of every topic the caller can see. RLS-scoped via `queryAs`
   * like everywhere else in this class: `topic_words_select`'s
   * `can_read_topic()` already grants any authenticated caller read access
   * to these 4 topics (seeded `is_public = true`), and
   * `user_word_srs_all_own` already narrows the left join to the caller's
   * own mastery state, so no explicit `user_id` predicate is needed here
   * either.
   *
   * "Current tier" is the first tier in ladder order that isn't fully
   * cleared (`masteredCount < wordCount`), not the last one that *is*
   * cleared -- the ladder is sequential by construction (`TIER_TOPICS`'
   * own array order), so the first incomplete tier is always the one
   * actively being worked toward. A topic with zero words (shouldn't
   * happen with the seeded dataset, but a config edit could produce one)
   * is never treated as "cleared" -- `wordCount > 0` is required, the same
   * divide-by-zero guard `MasteryRing`'s frontend already uses for the
   * same reason.
   */
  async getTierProgress(userId: string): Promise<TierProgress> {
    const rows = await this.db.queryAs<{
      topic_id: string;
      word_count: string;
      mastered_count: string;
    }>(
      userId,
      `select tw.topic_id,
              count(distinct tw.id) as word_count,
              count(distinct uws.topic_word_id) filter (where uws.mastered_at is not null) as mastered_count
         from public.topic_words tw
         left join public.user_word_srs uws on uws.topic_word_id = tw.id
        where tw.topic_id = any($1::uuid[])
        group by tw.topic_id`,
      [TIER_TOPICS.map((t) => t.topicId)],
    );

    const byTopicId = new Map(
      rows.map((r) => [
        r.topic_id,
        { wordCount: Number(r.word_count), masteredCount: Number(r.mastered_count) },
      ]),
    );

    let clearedThrough = -1;
    for (let i = 0; i < TIER_TOPICS.length; i++) {
      const stats = byTopicId.get(TIER_TOPICS[i].topicId);
      const cleared = !!stats && stats.wordCount > 0 && stats.masteredCount >= stats.wordCount;
      if (!cleared) break;
      clearedThrough = i;
    }

    const activeIndex = Math.min(clearedThrough + 1, TIER_TOPICS.length - 1);
    const active = TIER_TOPICS[activeIndex];
    const activeStats = byTopicId.get(active.topicId) ?? { wordCount: 0, masteredCount: 0 };
    const next = activeIndex + 1 < TIER_TOPICS.length ? TIER_TOPICS[activeIndex + 1] : null;

    return {
      tier: active.tier,
      tierName: active.tierName,
      masteredInTier: activeStats.masteredCount,
      wordsInTier: activeStats.wordCount,
      nextTierName: next?.tierName ?? null,
      wordsToNextTier: next ? activeStats.wordCount - activeStats.masteredCount : null,
    };
  }

  /** FR-4.3 — see StartSessionDto's header comment for why this has no persisted "session" row. */
  async startSession(userId: string, dto: StartSessionDto): Promise<SessionResult> {
    const mode: SessionMode = dto.mode ?? 'STANDARD';
    // S1 "Plant them now" plants the seeds the learner just saw, whatever
    // is left of today's Plant mission.
    const newCap = dto.seedsOf
      ? Number.POSITIVE_INFINITY
      : dto.dueOnly
        ? 0
        : await this.newWordAllowance(userId);
    const cards = await this.findDue(
      userId,
      dto.topicId,
      dto.limit ?? 20,
      dto.newOnly ?? false,
      newCap,
      dto.seedsOf,
    );
    // Analytics (plan section 5): a planting session with nothing to plant
    // while today's Plant mission still wants words. Should stay at 0.
    if (dto.newOnly && !dto.seedsOf && newCap > 0 && !cards.some((c) => c.is_new)) {
      const date = new Date().toISOString().slice(0, 10);
      this.logger.error(`ALERT planting_empty: user ${userId} had nothing to plant (${date})`);
      await this.db.withUser(userId, (client) =>
        recordEvent(client, 'planting_empty', { user_id: userId, date }),
      );
    }
    return { mode, cards };
  }

  /**
   * Daily goal missions: how many new words a session may still plant
   * today (what's left of the LEARN_NEW mission; 0 on a catch-up day).
   */
  private async newWordAllowance(userId: string): Promise<number> {
    return this.db.withUser(userId, async (client) => {
      const missionClient = client as unknown as MissionClient;
      const timezone = await resolveUserTimezone(
        async <T extends Record<string, unknown>>(text: string, params: unknown[]) =>
          (await missionClient.query<T>(text, params)).rows,
        userId,
      );
      return newWordAllowance(missionClient, userId, localDateOf(new Date(), timezone));
    });
  }

  /**
   * Architecture doc §1 — offline review logs replayed on reconnect.
   * Applies each item in ascending `reviewedAt` order (so recent-mistake
   * windows and interval math see the reviews in the order they actually
   * happened, not upload order) via the same `rate()` logic, using each
   * item's own client timestamp as `now`. One item failing (e.g. a
   * `topicWordId` that no longer exists) does not fail the batch — matches
   * `EnrichmentProcessor`'s per-word failure isolation elsewhere in this
   * codebase.
   */
  async sync(userId: string, dto: SyncReviewsDto): Promise<SyncItemResult[]> {
    const ordered = [...dto.reviews].sort(
      (a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt),
    );

    const results: SyncItemResult[] = [];
    for (const item of ordered) {
      try {
        const result = await this.rate(userId, toRateDto(item), new Date(item.reviewedAt), 'sync');
        results.push({ topicWordId: item.topicWordId, status: 'applied', result });
      } catch (err) {
        results.push({
          topicWordId: item.topicWordId,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return results;
  }
}

function toRateDto(item: SyncReviewItemDto): RateWordDto {
  const dto = new RateWordDto();
  dto.topicWordId = item.topicWordId;
  dto.rating = item.rating;
  dto.responseMs = item.responseMs;
  return dto;
}

/**
 * Consecutive UTC calendar days ending today or yesterday (a day not yet
 * studied doesn't break a streak until it's fully elapsed). Exported —
 * `computeSrsSummary` below (used by both `SrsService.stats` and
 * `NotificationProcessor`) reuses this for the same reason
 * `QuizService.leechDrill` reuses `SrsService.findLeeches`: one definition
 * of "what counts as a streak."
 */
export function computeStreak(descendingDates: string[], todayDateString?: string): number {
  if (descendingDates.length === 0) return 0;

  const toUtcDay = (d: string): number => Date.parse(`${d}T00:00:00.000Z`) / 86_400_000;
  const days = descendingDates.map(toUtcDay);
  // `todayDateString` (a YYYY-MM-DD calendar date, resolved in the user's
  // timezone by `computeSrsSummary` below) is what makes this respect a
  // non-UTC user's actual "today" -- omitting it falls back to the UTC
  // calendar day of the current instant, this function's original
  // (and still UTC-only) behavior.
  const todayUtcDay = todayDateString
    ? toUtcDay(todayDateString)
    : Math.floor(Date.now() / 86_400_000);

  let cursor = todayUtcDay;
  // A streak "counts" today only if studied already; otherwise it starts checking from yesterday.
  if (days[0] !== todayUtcDay) {
    if (days[0] !== todayUtcDay - 1) return 0;
    cursor = todayUtcDay - 1;
  }

  let streak = 0;
  for (const day of days) {
    if (day === cursor) {
      streak += 1;
      cursor -= 1;
    } else if (day < cursor) {
      break;
    }
  }
  return streak;
}

/**
 * Freezes refilled every local Monday: up to this many, keeping more when the
 * learner holds more (A4's weekly reward can add one, up to
 * STREAK_FREEZES_MAX = 3 in missions/weekly.plan.ts).
 */
export const STREAK_FREEZES_PER_WEEK = 2;

const DAY_MS = 86_400_000;
const toDayNum = (d: string): number => Date.parse(`${d}T00:00:00.000Z`) / DAY_MS;
const fromDayNum = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

/**
 * UI-6 U6-3: current + best streak where a frozen day keeps the chain alive
 * but doesn't add to it (only study days count). Same "today not studied
 * yet doesn't break it" rule as `computeStreak`; with no frozen days the
 * current value equals `computeStreak`'s.
 */
export function computeStreakWithFreezes(
  studyDates: string[],
  frozenDates: string[],
  todayDateString: string,
): { current: number; best: number } {
  const study = new Set(studyDates.map(toDayNum));
  const kept = new Set([...study, ...frozenDates.map(toDayNum)]);
  const today = toDayNum(todayDateString);

  let current = 0;
  let cursor = kept.has(today) ? today : today - 1;
  while (kept.has(cursor)) {
    if (study.has(cursor)) current += 1;
    cursor -= 1;
  }

  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of [...kept].sort((a, b) => a - b)) {
    run = prev !== null && day === prev + 1 ? run : 0;
    if (study.has(day)) run += 1;
    best = Math.max(best, run);
    prev = day;
  }
  return { current, best: Math.max(best, current) };
}

/**
 * UI-6 U6-3: lazy weekly refill + auto-use for the current gap. Pure: the
 * caller persists `newFrozen` / `available` / `refilledOn` when `changed`.
 * Missed days = the local days after the last studied-or-frozen day up to
 * yesterday; they're frozen only if the freezes left cover all of them
 * (a gap longer than that loses the streak anyway, so none are spent).
 */
export function applyStreakFreezes(input: {
  studyDates: string[];
  frozenDates: string[];
  available: number | null | undefined;
  refilledOn: string | null | undefined;
  today: string;
}): {
  available: number;
  refilledOn: string;
  newFrozen: string[];
  usedThisWeek: number;
  refillsOn: string;
  changed: boolean;
} {
  const today = toDayNum(input.today);
  const dow = new Date(today * DAY_MS).getUTCDay(); // 0 = Sunday
  const monday = today - ((dow + 6) % 7);
  const mondayStr = fromDayNum(monday);

  let available = Math.max(
    0,
    Math.min(STREAK_FREEZES_MAX, Number(input.available ?? STREAK_FREEZES_PER_WEEK)),
  );
  let changed = false;
  if (!input.refilledOn || toDayNum(input.refilledOn) < monday) {
    // max(current, 2): a rain barrel earned from A4's weekly missions survives Monday.
    available = Math.max(available, STREAK_FREEZES_PER_WEEK);
    changed = true;
  }
  const refilledOn = changed ? mondayStr : (input.refilledOn as string);

  const keptDays = [...input.studyDates, ...input.frozenDates].map(toDayNum);
  const newFrozen: string[] = [];
  if (keptDays.length > 0) {
    const last = Math.max(...keptDays);
    const missed = today - 1 - last;
    if (missed > 0 && missed <= available) {
      for (let d = last + 1; d <= today - 1; d += 1) newFrozen.push(fromDayNum(d));
      available -= missed;
      changed = true;
    }
  }

  const usedThisWeek = [...input.frozenDates, ...newFrozen].filter(
    (d) => toDayNum(d) >= monday,
  ).length;
  return {
    available,
    refilledOn,
    newFrozen,
    usedThisWeek,
    refillsOn: fromDayNum(monday + 7),
    changed,
  };
}

/**
 * A minimal query executor `computeSrsSummary` can run against -- exactly
 * the shape `DatabaseService.queryAs`/`.query` already have, so a caller
 * passes one of those in directly as a closure rather than this file
 * needing to know about `DatabaseService` at all.
 */
type SummaryQueryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[],
) => Promise<T[]>;

/**
 * Fallback default for `resolveUserTimezone` below, when neither a stored
 * preference nor a detected zone is available -- matches Dygo's core
 * Vietnamese-market audience (see phase 2.md's target-user framing), not
 * a neutral choice like UTC, since a wrong-but-plausible default here
 * beats one that's wrong for (almost) everyone.
 */
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

function isValidTimezone(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try {
    // Throws RangeError on an unrecognized IANA zone name -- the cheapest
    // validation available without a bundled tz-data lookup table, and
    // exactly what Postgres's own `at time zone $1` would otherwise reject
    // less gracefully (a raw SQL error rather than a clean fallback).
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Single definition of "what timezone is this user's day measured in,"
 * mirroring the frontend's `lib/timezone.ts` (added the same pass, after
 * a UTC+8 user saw Home's ribbon and streak stuck on the previous day
 * for the first ~8 hours of their local day -- both sides of this bug
 * shared one root cause: hardcoded UTC day-truncation).
 *
 * Resolution order: `profiles.timezone` once it's actually been set by
 * the user (the column defaults to the literal 'UTC', which is this
 * schema's "never configured" sentinel, not a real preference -- see
 * 001_initial_schema.sql's own comment on the column) -> the caller's
 * detected browser zone (`detectedTz`, e.g. from
 * `Intl.DateTimeFormat().resolvedOptions().timeZone`, threaded through
 * from the frontend as a query param since there is no user-facing
 * timezone setting yet to have stored a preference in the first place)
 * -> `DEFAULT_TIMEZONE`. Takes the same `queryFn` shape `computeSrsSummary`
 * does, for the same reason: `SrsService`'s callers pass an RLS-scoped
 * closure, `NotificationProcessor`'s pass an unscoped one with no
 * per-request JWT to scope by.
 */
export async function resolveUserTimezone(
  queryFn: SummaryQueryFn,
  userId: string,
  detectedTz?: string,
): Promise<string> {
  const rows = await queryFn<{ timezone: string }>(
    `select timezone from public.profiles where id = $1`,
    [userId],
  );
  const stored = rows[0]?.timezone;
  if (stored && stored !== 'UTC') return stored;
  if (isValidTimezone(detectedTz)) return detectedTz;
  return DEFAULT_TIMEZONE;
}

/**
 * Today's calendar date (YYYY-MM-DD) in `timezone` -- mirrors the
 * frontend's `lib/timezone.ts#toLocalDateString`. Reads the current
 * instant via `Date.now()` rather than `new Date()` so a test that mocks
 * `Date.now` (as several in srs.service.spec.ts already do) still
 * controls "now" here -- `new Date()`'s no-arg form does not consult a
 * reassigned `Date.now` in V8, only `new Date(explicitMillis)` does.
 */
function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now()));
}

/**
 * The single definition of "this user's streak/due/leech/mastery numbers"
 * -- extracted 2026-09-19 (Phase 2 FR-9.1/9.2/9.3's deeper fix, per
 * `phase 2 implementation plan.md` §4 steps 5-6) out of what used to be
 * `SrsService.stats()`'s own private query, after `NotificationProcessor.
 * buildPayload()` was found to hand-maintain a *second*, independently
 * written copy of the due-now/leech-count half of this same query (same
 * numbers today, but two authored copies of one computation is exactly
 * the "no single source of truth" pattern Module 9 exists to close, not
 * just the one visible Home-page bug the live audit actually caught).
 *
 * Takes a `queryFn` rather than a `DatabaseService` directly so it works
 * unchanged for both callers' very different execution contexts:
 * `SrsService.stats()` needs this RLS-scoped to one authenticated caller
 * (`queryAs(userId, ...)`), while `NotificationProcessor` iterates many
 * users from a BullMQ cron tick with no per-request JWT to scope by, and
 * deliberately runs unscoped (`query(...)`, the bare `authenticator` role)
 * with an explicit `where user_id = $1` instead -- forcing it onto the
 * RLS-scoped path would mean one Postgres connection/transaction per user
 * per tick, which is the wrong tradeoff for a batch job. The SQL below
 * always filters by `$1` explicitly (even on the RLS-scoped path, where
 * `user_word_srs_all_own`'s policy would already narrow it to the same
 * rows) so both callers run the exact same query text -- belt-and-
 * suspenders on the RLS-scoped path, load-bearing on the unscoped one,
 * but one string either way rather than two.
 */
export async function computeSrsSummary(
  queryFn: SummaryQueryFn,
  userId: string,
  timezone: string = DEFAULT_TIMEZONE,
): Promise<SrsStats> {
  const [totals, streakRows, profileRows, freezeRows] = await Promise.all([
    queryFn<{
      total_words: string;
      mastered_words: string;
      due_now: string;
      leech_count: string;
      new_rows?: string;
      learning_words?: string;
      review_words?: string;
      unseen_words?: string;
    }>(
      // UI-4 U4-2: stage counts ride on this same query (no extra round
      // trip, so callers' positional mocks/ordering stay unchanged).
      // `unseen_words` mirrors `findDue`'s new-card rule (READY words with
      // no `user_word_srs` row): on the RLS-scoped path topic_words is
      // narrowed to topics the caller can read; the unscoped
      // NotificationProcessor path ignores stage_counts.
      `select
         count(*) as total_words,
         count(*) filter (where mastered_at is not null) as mastered_words,
         count(*) filter (where next_due_at <= now()) as due_now,
         count(*) filter (where is_leech) as leech_count,
         count(*) filter (where mastered_at is null and fsrs_state = 'New') as new_rows,
         count(*) filter (where mastered_at is null and fsrs_state in ('Learning', 'Relearning')) as learning_words,
         count(*) filter (where mastered_at is null and fsrs_state = 'Review') as review_words,
         (select count(*)
            from public.topic_words tw
           where tw.status = 'READY'
             and not exists (
               select 1 from public.user_word_srs u2
                where u2.topic_word_id = tw.id and u2.user_id = $1
             )) as unseen_words
       from public.user_word_srs
      where user_id = $1`,
      [userId],
    ),
    queryFn<{ review_date: string }>(
      // Cast all the way to text: pg's default type parser turns a bare
      // ::date column back into a JS Date object, which would just have to
      // be re-serialized below. review_date is never sent to a client, so
      // asking Postgres for text directly is simpler than fighting that.
      // `timezone` (resolved by the caller via `resolveUserTimezone`) is
      // what a "day" means for this streak -- was hardcoded 'utc', which
      // held a UTC+N user's streak on the previous day for the first N
      // hours of their local day.
      `select distinct (reviewed_at at time zone $2)::date::text as review_date
         from public.review_logs
        where user_id = $1
        order by review_date desc
        limit 366`,
      [userId, timezone],
    ),
    // Deliberately its own query rather than a join onto `user_word_srs`
    // above: a fresh account has zero `user_word_srs` rows, and joining
    // would either drop the whole result (inner join) or force
    // `display_name` into the aggregate's GROUP BY for no reason (left
    // join). `profiles` is a one-row-per-user lookup by primary key --
    // cheap regardless.
    // UI-6 U6-3: freeze columns ride on the same profile lookup.
    queryFn<{
      display_name: string | null;
      streak_freezes_available?: number | null;
      freezes_refilled_on?: string | null;
    }>(
      `select display_name, streak_freezes_available,
              freezes_refilled_on::text as freezes_refilled_on
         from public.profiles where id = $1`,
      [userId],
    ),
    queryFn<{ local_date: string }>(
      `select local_date::text as local_date
         from public.streak_freeze_uses
        where user_id = $1
        order by local_date desc
        limit 366`,
      [userId],
    ),
  ]);

  const today = todayInTimezone(timezone);
  const studyDates = (streakRows ?? []).map((r) => r.review_date);
  const frozenDates = (freezeRows ?? []).map((r) => r.local_date);
  const profile = profileRows?.[0];
  const freeze = applyStreakFreezes({
    studyDates,
    frozenDates,
    available: profile?.streak_freezes_available,
    refilledOn: profile?.freezes_refilled_on,
    today,
  });
  if (freeze.changed) {
    // One statement so the freeze rows and the counter move together.
    await queryFn(
      `with used as (
         insert into public.streak_freeze_uses (user_id, local_date)
         select $1, d from unnest($2::date[]) as d
         on conflict (user_id, local_date) do nothing
         returning 1
       )
       update public.profiles
          set streak_freezes_available = $3, freezes_refilled_on = $4::date
        where id = $1`,
      [userId, freeze.newFrozen, freeze.available, freeze.refilledOn],
    );
  }
  const streak = computeStreakWithFreezes(studyDates, [...frozenDates, ...freeze.newFrozen], today);

  const t = totals[0];
  return {
    total_words: Number(t?.total_words ?? 0),
    mastered_words: Number(t?.mastered_words ?? 0),
    due_now: Number(t?.due_now ?? 0),
    leech_count: Number(t?.leech_count ?? 0),
    current_streak_days: streak.current,
    display_name: profile?.display_name ?? null,
    stage_counts: {
      new: Number(t?.new_rows ?? 0) + Number(t?.unseen_words ?? 0),
      learning: Number(t?.learning_words ?? 0),
      review: Number(t?.review_words ?? 0),
      mastered: Number(t?.mastered_words ?? 0),
    },
    freezes: {
      available: freeze.available,
      used_this_week: freeze.usedThisWeek,
      refills_on: freeze.refillsOn,
    },
    best_streak_days: streak.best,
  };
}

/** A pause longer than this ends a learning session. */
export const GARDEN_IDLE_GAP_SECONDS = 300;
/** Most a session's first answer can add on its own. */
export const GARDEN_FIRST_EVENT_CAP_MS = 60_000;

/**
 * Me's "in the garden": time spent learning, worked out from what the
 * learner already leaves behind, so it covers their whole history with no
 * client-side timer. Every review (flashcard, quiz, leech drill) and every
 * speaking attempt is one event. Each event adds the time since the
 * previous one when that gap is at most `GARDEN_IDLE_GAP_SECONDS`;
 * otherwise it starts a new session and adds only its own duration
 * (`response_ms` / `user_duration_ms`, capped at
 * `GARDEN_FIRST_EVENT_CAP_MS`). Time spent reading a card before the first
 * answer of a session isn't counted, so this slightly undercounts.
 */
export async function computeGardenMinutes(
  queryFn: SummaryQueryFn,
  userId: string,
): Promise<number> {
  const rows = await queryFn<{ seconds: string | number | null }>(
    `select coalesce(sum(
              case when gap is not null and gap <= $2 then gap
                   else least(own_ms, $3) / 1000.0 end), 0) as seconds
       from (
         select extract(epoch from at - lag(at) over (order by at)) as gap, own_ms
           from (
             select reviewed_at as at, coalesce(response_ms, 0) as own_ms
               from public.review_logs where user_id = $1
             union all
             select created_at, user_duration_ms
               from public.speaking_attempts where user_id = $1
           ) events
       ) gaps`,
    [userId, GARDEN_IDLE_GAP_SECONDS, GARDEN_FIRST_EVENT_CAP_MS],
  );
  const seconds = Number(rows?.[0]?.seconds ?? 0);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds / 60) : 0;
}

/** Columns `applyReview` reads from `user_word_srs`. */
interface SrsStateRow {
  fsrs_state: FsrsStateName;
  stability: number | null;
  difficulty: number | null;
  reps: number;
  lapses: number;
  learning_steps: number;
  scheduled_days: number;
  last_reviewed_at: Date | string | null;
  next_due_at: Date | string;
  mastered_at: Date | string | null;
  is_leech: boolean;
}

function rowToCard(row: SrsStateRow): FsrsCardState {
  return {
    state: row.fsrs_state,
    stability: row.stability,
    difficulty: row.difficulty,
    reps: row.reps,
    lapses: row.lapses,
    learningSteps: row.learning_steps ?? 0,
    scheduledDays: Number(row.scheduled_days ?? 0),
    lastReviewAt: row.last_reviewed_at ? new Date(row.last_reviewed_at) : null,
    dueAt: new Date(row.next_due_at),
  };
}

/**
 * Adds read-time recall probability and interval previews to due cards.
 * Retrievability is null for new cards; interval_preview shows the next-due
 * date for each rating (Again/Hard/Good/Easy) computed via ts-fsrs.
 */
function withRetrievability(cards: DueCard[], now: Date): DueCard[] {
  return cards.map((c) => {
    // Build the card state once so both retrievability and intervals use the
    // same shape (FSRS expects FsrsCardState).
    const cardState = {
      state: c.state,
      stability: c.stability,
      difficulty: c.difficulty,
      reps: c.reps,
      lapses: c.lapses,
      learningSteps: Number(c.learning_steps ?? 0),
      scheduledDays: Number(c.scheduled_days ?? 0),
      lastReviewAt: c.last_reviewed_at ? new Date(c.last_reviewed_at) : null,
      dueAt: new Date(c.next_due_at ?? now),
    } as const;

    return {
      ...c,
      // UI-4: Compute retrievability (existing logic)
      retrievability: c.is_new || c.next_due_at == null ? null : retrievability(cardState, now),
      // UI-4: Compute interval previews for the Watering Page rating buttons
      // U4-1: same EASY→GOOD rule as rate() for words with no user_word_srs row.
      interval_preview: computeRatingIntervals(cardState, now, c.is_new === true),
    };
  });
}
