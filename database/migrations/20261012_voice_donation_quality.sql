-- Voice donation quality ("docs/plans/Voice donation quality plan.md", 2026-10-12):
-- the backend now decides at capture time whether a recording is worth keeping
-- (quality gate, 2 per prompt, 20 per day, smart sampling, 30 per prompt per
-- region). These columns let it count without decrypting anything.
--
--   text_norm    the practised word or sentence, lower case, punctuation removed
--                (the same normalisation as the dataset tools' words_of)
--   region       the donor's region when the recording was kept (quota per region)
--   kept_reason  why it was kept: uncertain, flagged, disagree, hard_sound or
--                sample; null for recordings kept before this change
--
-- Old rows keep nulls until `dataset/run.sh cleanup --apply` (GOPT repo)
-- re-checks them and fills the columns for the ones it keeps.
-- Needs 20261011_voice_donation.sql.

alter table public.voice_donations
  add column text_norm   text,
  add column region      text
    constraint voice_donations_region_check check (region in ('north', 'central', 'south', 'elsewhere')),
  add column kept_reason text
    constraint voice_donations_kept_reason_check
    check (kept_reason in ('uncertain', 'flagged', 'disagree', 'hard_sound', 'sample'));

create index voice_donations_donor_prompt on public.voice_donations (donor_code, kind, text_norm);
create index voice_donations_prompt_region on public.voice_donations (kind, text_norm, region);

comment on column public.voice_donations.text_norm is
  'Voice donation quality: the practised text, lower case, punctuation removed; counts attempts per prompt.';
comment on column public.voice_donations.region is
  'Voice donation quality: the donor''s region when kept; null = not said (or kept before 2026-10-12).';
comment on column public.voice_donations.kept_reason is
  'Voice donation quality: uncertain, flagged, disagree, hard_sound or sample; null = kept before the rules.';
