import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { RateWordDto } from './dto/rate-word.dto';
import { SessionMode, StartSessionDto } from './dto/start-session.dto';
import { SyncReviewItemDto, SyncReviewsDto } from './dto/sync-reviews.dto';
import { LEECH_THRESHOLD, SrsCardState, applyRating } from './srs-algorithm';

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
  /** True if this word has never been reviewed — no `user_word_srs` row yet (FR-4.2's "new card"). */
  is_new: boolean;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  is_leech: boolean;
  next_due_at: Date | null;
}

export interface RateWordResult {
  topic_word_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  is_leech: boolean;
  was_correct: boolean;
  next_due_at: Date;
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
}

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
  ml.example_sentences
`;

/**
 * Module 3 — Error-adaptive spaced repetition (Phase 2). See
 * `srs-algorithm.ts` for the scoring math; this class owns the DB
 * transactions and RLS scoping (same split, and the same `queryAs`/`withUser`
 * pattern, as `TopicsService`).
 */
@Injectable()
export class SrsService {
  constructor(protected readonly db: DatabaseService) {}

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
   */
  async findDue(userId: string, topicId?: string, limit = 50): Promise<DueCard[]> {
    const dueExisting = await this.db.queryAs<DueCard>(
      userId,
      `select ${DUE_CARD_COLUMNS},
              false as is_new,
              uws.ease_factor, uws.interval_days, uws.repetitions,
              uws.is_leech, uws.next_due_at
         from public.user_word_srs uws
         join public.topic_words tw on tw.id = uws.topic_word_id
         left join public.master_lexicon ml on ml.id = tw.lexicon_id
        where uws.next_due_at <= now()
          ${topicId ? 'and tw.topic_id = $1' : ''}
        order by uws.next_due_at asc
        limit ${topicId ? '$2' : '$1'}`,
      topicId ? [topicId, limit] : [limit],
    );

    const remaining = Math.max(0, limit - dueExisting.length);
    if (remaining === 0) {
      return dueExisting;
    }

    // "not exists" against user_word_srs is still RLS-scoped to this caller
    // (every scan of that table carries the policy, regardless of clause
    // shape — see TopicsService.findAllVisible's comment for the same point),
    // so no explicit user_id predicate is needed here.
    const newCards = await this.db.queryAs<DueCard>(
      userId,
      `select ${DUE_CARD_COLUMNS},
              true as is_new,
              -- Cast explicitly: an un-cast numeric literal (2.5) comes back
              -- from pg as a string (its default NUMERIC parser), unlike the
              -- "existing due" query's real ease_factor column above — this
              -- keeps both branches' rows the same JS shape.
              2.5::real as ease_factor, 0 as interval_days, 0 as repetitions,
              false as is_leech, null::timestamptz as next_due_at
         from public.topic_words tw
         left join public.master_lexicon ml on ml.id = tw.lexicon_id
        where tw.status = 'READY'
          and not exists (
            select 1 from public.user_word_srs uws where uws.topic_word_id = tw.id
          )
          ${topicId ? 'and tw.topic_id = $1' : ''}
        order by tw.created_at asc
        limit ${topicId ? '$2' : '$1'}`,
      topicId ? [topicId, remaining] : [remaining],
    );

    return [...dueExisting, ...newCards];
  }

  /**
   * Applies one FR-3.2 rating. Runs as a single transaction: read current
   * state → count recent mistakes → insert the `review_logs` row → upsert
   * `user_word_srs`. All four steps need to see the same snapshot and land
   * atomically, which `queryAs` (single-statement) can't guarantee.
   */
  async rate(userId: string, dto: RateWordDto, now: Date = new Date()): Promise<RateWordResult> {
    return this.db.withUser(userId, async (client) => {
      // Confirms the word exists and is readable (topic_words_select via
      // can_read_topic) before doing anything else — a bad/foreign
      // topicWordId should 404, not silently no-op through the upsert below.
      const wordRows = await client.query<{ id: string }>(
        `select id from public.topic_words where id = $1`,
        [dto.topicWordId],
      );
      if (wordRows.rows.length === 0) {
        throw new NotFoundException('Word not found.');
      }

      const stateRows = await client.query<{
        ease_factor: number;
        interval_days: number;
        repetitions: number;
      }>(
        `select ease_factor, interval_days, repetitions
           from public.user_word_srs
          where topic_word_id = $1`,
        [dto.topicWordId],
      );
      // pg returns snake_case columns; normalize to the camelCase shape the
      // pure algorithm expects. No existing row means a never-reviewed
      // ("new") card — SM-2's conventional starting state.
      const currentState: SrsCardState = stateRows.rows[0]
        ? {
            easeFactor: stateRows.rows[0].ease_factor,
            intervalDays: stateRows.rows[0].interval_days,
            repetitions: stateRows.rows[0].repetitions,
          }
        : { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

      // M_recent — see srs-algorithm.ts's decay-strategy note. Counted
      // *before* inserting this review's own log row.
      const recentRows = await client.query<{ count: string }>(
        `select count(*) as count
           from public.review_logs
          where topic_word_id = $1
            and rating = 'AGAIN'
            and reviewed_at >= $2::timestamptz - interval '7 days'`,
        [dto.topicWordId, now.toISOString()],
      );
      const recentMistakesBefore = Number(recentRows.rows[0]?.count ?? 0);

      const outcome = applyRating(currentState, dto.rating, recentMistakesBefore, now);
      const recentMistakesAfter = recentMistakesBefore + outcome.mistakeIncrement;
      const isLeech = recentMistakesAfter >= LEECH_THRESHOLD;

      await client.query(
        `insert into public.review_logs
           (user_id, topic_word_id, rating, was_correct, response_ms, ease_factor_after, interval_days_after, reviewed_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          dto.topicWordId,
          dto.rating,
          outcome.wasCorrect,
          dto.responseMs ?? null,
          outcome.easeFactor,
          outcome.intervalDays,
          now.toISOString(),
        ],
      );

      const upserted = await client.query<{
        ease_factor: number;
        interval_days: number;
        repetitions: number;
        is_leech: boolean;
        next_due_at: Date;
      }>(
        `insert into public.user_word_srs
           (user_id, topic_word_id, ease_factor, interval_days, repetitions,
            total_mistakes, recent_mistakes, is_leech, last_reviewed_at, next_due_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict (user_id, topic_word_id) do update set
           ease_factor      = excluded.ease_factor,
           interval_days    = excluded.interval_days,
           repetitions      = excluded.repetitions,
           total_mistakes   = public.user_word_srs.total_mistakes + excluded.total_mistakes,
           recent_mistakes  = excluded.recent_mistakes,
           is_leech         = excluded.is_leech,
           last_reviewed_at = excluded.last_reviewed_at,
           next_due_at      = excluded.next_due_at,
           updated_at       = now()
         returning ease_factor, interval_days, repetitions, is_leech, next_due_at`,
        [
          userId,
          dto.topicWordId,
          outcome.easeFactor,
          outcome.intervalDays,
          outcome.repetitions,
          outcome.mistakeIncrement,
          recentMistakesAfter,
          isLeech,
          now.toISOString(),
          outcome.nextDueAt.toISOString(),
        ],
      );

      const row = upserted.rows[0];
      return {
        topic_word_id: dto.topicWordId,
        ease_factor: row.ease_factor,
        interval_days: row.interval_days,
        repetitions: row.repetitions,
        is_leech: row.is_leech,
        was_correct: outcome.wasCorrect,
        next_due_at: row.next_due_at,
      };
    });
  }

  /** FR-3.3 — the remedial queue. Reads the stored `is_leech` flag, not a live aggregate (see srs-algorithm.ts). */
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
   * FR-8.1's per-student view. No SLO documented for this endpoint, so it
   * runs three small aggregate queries plus one for the streak rather than
   * optimizing prematurely.
   */
  async stats(userId: string): Promise<SrsStats> {
    const [totals, streakRows] = await Promise.all([
      this.db.queryAs<{
        total_words: string;
        mastered_words: string;
        due_now: string;
        leech_count: string;
      }>(
        userId,
        `select
           count(*) as total_words,
           count(*) filter (where repetitions >= 4) as mastered_words,
           count(*) filter (where next_due_at <= now()) as due_now,
           count(*) filter (where is_leech) as leech_count
         from public.user_word_srs`,
      ),
      this.db.queryAs<{ review_date: string }>(
        userId,
        // Cast all the way to text: pg's default type parser turns a bare
        // ::date column back into a JS Date object, which would just have to
        // be re-serialized below. review_date is never sent to a client, so
        // asking Postgres for text directly is simpler than fighting that.
        `select distinct (reviewed_at at time zone 'utc')::date::text as review_date
           from public.review_logs
          order by review_date desc
          limit 366`,
      ),
    ]);

    const t = totals[0];
    return {
      total_words: Number(t?.total_words ?? 0),
      mastered_words: Number(t?.mastered_words ?? 0),
      due_now: Number(t?.due_now ?? 0),
      leech_count: Number(t?.leech_count ?? 0),
      current_streak_days: computeStreak(streakRows.map((r) => r.review_date)),
    };
  }

  /** FR-4.3 — see StartSessionDto's header comment for why this has no persisted "session" row. */
  async startSession(userId: string, dto: StartSessionDto): Promise<SessionResult> {
    const mode: SessionMode = dto.mode ?? 'STANDARD';
    const cards = await this.findDue(userId, dto.topicId, dto.limit ?? 20);
    return { mode, cards };
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
        const result = await this.rate(userId, toRateDto(item), new Date(item.reviewedAt));
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

/** Consecutive UTC calendar days ending today or yesterday (a day not yet studied doesn't break a streak until it's fully elapsed). */
function computeStreak(descendingDates: string[]): number {
  if (descendingDates.length === 0) return 0;

  const toUtcDay = (d: string): number => Date.parse(`${d}T00:00:00.000Z`) / 86_400_000;
  const days = descendingDates.map(toUtcDay);
  const todayUtcDay = Math.floor(Date.now() / 86_400_000);

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
