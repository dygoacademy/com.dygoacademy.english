-- Onboarding OB1–OB5 (docs/design/garden/CHANGELOG.md, page "Adult ·
-- Onboarding", after AU2 Create account): the choices a new learner makes
-- before their first garden, and whether they have finished.
--
--   onboarded_at    when the learner finished onboarding (OB5 "Water your
--                   first words"). null = not done yet: the garden home
--                   sends them to OB1. Every profile that exists when this
--                   runs is backfilled as done, so existing learners are
--                   never sent through onboarding.
--   cefr_level      OB1 "Your level" (A2–C1 offered; Skip / "Not sure?" = B1).
--   study_goal      OB2: IELTS, PTE or LIFE ("just for life").
--   target_band     OB2 target: IELTS 4.0–9.0 in half bands, PTE 30–90
--                   whole points; null for LIFE (or not chosen).
--   first_topic_id  OB3 "First topic": the bed the learner picked. Set null
--                   if that topic is deleted.
--
-- Written by PATCH /api/v1/profiles/me/onboarding. RLS is unchanged: the
-- caller can only update their own row (profiles_update_self), and
-- authenticated already has update on public.profiles (06_grants.sql).
-- Self-contained (needs only the baseline schema), so the RLS suite can
-- apply it on top of the core fixtures.

alter table public.profiles
  add column onboarded_at   timestamptz,
  add column cefr_level     public.cefr_level,
  add column study_goal     text
    constraint profiles_study_goal_check check (study_goal in ('IELTS', 'PTE', 'LIFE')),
  add column target_band    numeric(3, 1),
  add column first_topic_id uuid references public.topics(id) on delete set null;

alter table public.profiles
  add constraint profiles_target_band_check check (
    target_band is null
    or (study_goal = 'IELTS' and target_band between 4.0 and 9.0
        and target_band * 2 = trunc(target_band * 2))
    or (study_goal = 'PTE' and target_band between 30 and 90
        and target_band = trunc(target_band))
  );

-- Existing learners have already been using the garden: mark them done.
update public.profiles set onboarded_at = created_at where onboarded_at is null;

comment on column public.profiles.onboarded_at is
  'Onboarding OB5 finished; null = new learner, the garden home opens OB1. Backfilled for existing rows.';
comment on column public.profiles.cefr_level is
  'Onboarding OB1: the learner''s own level (A2–C1 offered; Skip = B1).';
comment on column public.profiles.study_goal is
  'Onboarding OB2: IELTS, PTE or LIFE.';
comment on column public.profiles.target_band is
  'Onboarding OB2: IELTS 4.0–9.0 (half bands) or PTE 30–90; null for LIFE.';
comment on column public.profiles.first_topic_id is
  'Onboarding OB3: the first bed the learner picked; null if none or deleted.';
