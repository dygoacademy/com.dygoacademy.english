-- Onboarding in 2 steps (docs/design/garden/CHANGELOG.md, 2026-10-11 and
-- 2026-10-12; "docs/plans/Onboarding simplify implementation plan.md"): OB1 About you
-- asks the level and the goal together, with goal chips IELTS Academic,
-- IELTS General, Work, Travel and Just for me.
--
--   study_goal   adds IELTS_GENERAL, WORK and TRAVEL. IELTS (= Academic),
--                LIFE (= Just for me) stay; PTE is no longer offered on
--                screen, but rows that have it stay valid.
--   target_band  IELTS_GENERAL takes the same half bands as IELTS
--                (4.0–9.0); WORK / TRAVEL / LIFE have none.
--
-- The first bed is now picked from the goal by PATCH
-- /profiles/me/onboarding (no OB3 screen); first_topic_id is unchanged.
-- Needs 20261008_onboarding.sql.

alter table public.profiles drop constraint profiles_study_goal_check;
alter table public.profiles
  add constraint profiles_study_goal_check
  check (study_goal in ('IELTS', 'IELTS_GENERAL', 'WORK', 'TRAVEL', 'LIFE', 'PTE'));

alter table public.profiles drop constraint profiles_target_band_check;
alter table public.profiles
  add constraint profiles_target_band_check check (
    target_band is null
    or (study_goal in ('IELTS', 'IELTS_GENERAL') and target_band between 4.0 and 9.0
        and target_band * 2 = trunc(target_band * 2))
    or (study_goal = 'PTE' and target_band between 30 and 90
        and target_band = trunc(target_band))
  );

comment on column public.profiles.study_goal is
  'Onboarding OB1: IELTS (Academic), IELTS_GENERAL, WORK, TRAVEL or LIFE (Just for me); PTE kept for old rows.';
comment on column public.profiles.target_band is
  'Onboarding OB1: IELTS / IELTS_GENERAL 4.0–9.0 (half bands) or PTE 30–90; null for the other goals.';
comment on column public.profiles.first_topic_id is
  'Onboarding: the first bed, picked from the goal when OB1 is saved; null if none or deleted.';
