-- =============================================================================
-- 020 — FSRS card state (Phase 10, Workstream 2)
--
-- Adds FSRS-6 memory state to user_word_srs alongside the legacy SM-2
-- columns (ease_factor / interval_days / repetitions). The application stops
-- reading and writing the SM-2 columns in the same release; they are dropped
-- later by 021_drop_sm2_columns.sql, only after the FSRS switch has been
-- verified live. See `phase 10 implementation plan.md` §2.4 and §4.
--
-- Customer-experience rules baked in here:
--   * next_due_at is NOT touched — nobody gets a due-count spike on switch
--     day; each word moves onto FSRS timing at its next natural review.
--   * mastered_at makes mastery sticky and grandfathers every word already
--     mastered under SM-2 (repetitions >= 4), so no learner sees their
--     mastered count drop at the switch. A word only loses mastery when the
--     learner actually gets it wrong.
--
-- Idempotent: guarded type creation, `add column if not exists`, and the
-- backfill only touches rows whose FSRS state has never been set.
-- For a more accurate backfill from real review history, run
-- `node com.dygoacademy.backend/scripts/backfill-fsrs.js` afterwards.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fsrs_state') then
    create type public.fsrs_state as enum ('New', 'Learning', 'Review', 'Relearning');
  end if;
end $$;

alter table public.user_word_srs
  add column if not exists fsrs_state     public.fsrs_state not null default 'New',
  add column if not exists stability      real,
  add column if not exists difficulty     real,
  add column if not exists reps           integer not null default 0,
  add column if not exists lapses         integer not null default 0,
  add column if not exists learning_steps integer not null default 0,
  add column if not exists scheduled_days real    not null default 0,
  add column if not exists mastered_at    timestamptz,
  add column if not exists fsrs_backfilled boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_word_srs_fsrs_ranges') then
    alter table public.user_word_srs
      add constraint user_word_srs_fsrs_ranges check (
        (stability is null or stability > 0)
        and (difficulty is null or difficulty between 1 and 10)
        and reps >= 0 and lapses >= 0 and scheduled_days >= 0
      );
  end if;
end $$;

comment on column public.user_word_srs.stability is
  'FSRS stability in days: the interval at which recall probability falls to 90%. Null for a New card.';
comment on column public.user_word_srs.difficulty is
  'FSRS difficulty, 1 (easiest) to 10 (hardest). Null for a New card.';
comment on column public.user_word_srs.mastered_at is
  'Set when stability first reaches the mastery threshold (21 days); cleared by a graded '
  'AGAIN. Sticky by design so mastery counts never drop without a visible mistake.';

-- Heuristic backfill from SM-2 state, for rows that have never been converted.
-- scripts/backfill-fsrs.js refines rows that have review history by replaying it.
update public.user_word_srs
   set fsrs_state = case
                      when repetitions > 0 then 'Review'::public.fsrs_state
                      when total_mistakes > 0 then 'Relearning'::public.fsrs_state
                      else 'New'::public.fsrs_state
                    end,
       stability  = case
                      when repetitions > 0 or total_mistakes > 0
                        then greatest(interval_days, 0.5)
                    end,
       difficulty = case
                      when repetitions > 0 or total_mistakes > 0
                        then least(10, greatest(1, 5 + (2.5 - ease_factor) * 2.5))
                    end,
       reps           = repetitions,
       lapses         = total_mistakes,
       scheduled_days = interval_days,
       mastered_at    = case when repetitions >= 4 then coalesce(last_reviewed_at, now()) end,
       fsrs_backfilled = true
 where not fsrs_backfilled
    -- Stragglers: rows the OLD (SM-2) backend wrote after this migration ran
    -- but before the FSRS backend was restarted. The FSRS backend never leaves
    -- a reviewed word in state 'New', so this can only match those rows;
    -- re-running this migration after the restart converts them.
    or (fsrs_state = 'New' and stability is null and (repetitions > 0 or total_mistakes > 0));

-- From here on every row the application writes is already FSRS-native, so
-- new rows default to "backfilled". The application never mentions this
-- column, which lets 021 drop it without breaking any write path.
alter table public.user_word_srs alter column fsrs_backfilled set default true;

-- Mastery reads (tier ladder, collection rings, stats) filter on mastered_at.
create index if not exists user_word_srs_mastered_idx
  on public.user_word_srs (user_id)
  where mastered_at is not null;
