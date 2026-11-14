-- A8d Meanings in (Adult Profile, board approved 2026-11-14): "Recall first".
-- With a meaning language set, the review card shows the English definition
-- first and keeps the translation hidden until the learner taps it.
-- On by default (Dylan, 2026-11-14), including for every existing learner.

alter table public.profiles
  add column if not exists recall_first boolean not null default true;

comment on column public.profiles.recall_first is
  'A8d Recall first: hide the meaning_locale translation on the review card until tapped. Default true.';
