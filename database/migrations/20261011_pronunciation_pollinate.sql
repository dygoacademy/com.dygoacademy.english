-- Pronunciation "Stepping stones" (docs/design/garden/CHANGELOG.md,
-- 2026-10-11, decision D-3 changed): saying a word at 80 %+ on P4 =
-- Pollinated. One rule, 80 %: there is no 90 % harvest any more.
--
--   speaking_harvests.score  now 80–100 (was 90–100). A row still means
--                            "this word was pollinated" (A7 "Bees are
--                            waiting"); visual only, it never changes SRS
--                            or review dates. Written by the word check
--                            (POST /speaking/word-check), once per word.
--
-- RLS and grants are unchanged. Self-contained on top of
-- 20261006_speaking_entry_points.sql, so the RLS suite can apply it.

alter table public.speaking_harvests
  drop constraint if exists speaking_harvests_score_check;
alter table public.speaking_harvests
  add constraint speaking_harvests_score_check check (score between 80 and 100);

comment on table public.speaking_harvests is
  'A7 "Bees are waiting": a word the learner said at 80%+ (Pronunciation P4, D-3 2026-10-11). '
  'Shown as pollinated; never changes SRS (D5). No audio is stored (D2).';
