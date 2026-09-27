-- =============================================================================
-- 019 — Review-signal logging (Phase 10, Workstream 1)
--
-- Adds the per-review context FSRS needs (and that any honest comparison of
-- flashcard vs. quiz evidence needs): where the review came from, whether it
-- actually moved the schedule, and the elapsed/scheduled time around it.
-- See `phase 10 implementation plan.md` §1.
--
-- Idempotent (`add column if not exists`), so safe to re-run on an
-- already-migrated database. `review_logs` is range-partitioned; adding a
-- column to the parent propagates to every partition, including
-- review_logs_default.
-- =============================================================================

alter table public.review_logs
  add column if not exists source           text    not null default 'flashcard',
  add column if not exists quiz_type        text,
  add column if not exists hint_used        boolean not null default false,
  add column if not exists graded           boolean not null default true,
  add column if not exists state_before     text,
  add column if not exists elapsed_days     real,
  add column if not exists scheduled_days   real,
  add column if not exists stability_after  real,
  add column if not exists difficulty_after real;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'review_logs_source_check') then
    alter table public.review_logs
      add constraint review_logs_source_check
      check (source in ('flashcard', 'quiz', 'leech_drill', 'sync'));
  end if;
end $$;

comment on column public.review_logs.source is
  'Where this review came from: flashcard (/study), quiz, leech_drill, or sync (offline replay).';
comment on column public.review_logs.graded is
  'false when the event was recorded for analytics only and did NOT move user_word_srs '
  '(e.g. a correct quiz answer on a word that was not due, or a second mistake on the '
  'same word in the same local day). Leech counting only looks at graded rows.';
comment on column public.review_logs.elapsed_days is
  'Actual days since this word''s previous graded review (null for a first review).';
comment on column public.review_logs.scheduled_days is
  'Interval, in days, that had been planned before this review.';

-- Leech detection counts graded AGAIN rows per word in a rolling 7 days.
create index if not exists review_logs_leech_window_idx
  on public.review_logs (topic_word_id, reviewed_at)
  where rating = 'AGAIN' and graded;
