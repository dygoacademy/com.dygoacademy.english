-- Phase 13 S13: daily spend caps for paid Google APIs. One row per
-- provider per UTC day with the units used (Gemini: calls; Google Cloud
-- TTS: characters). The backend (service_role) increments it before each
-- paid call and skips the call when the day's limit would be passed
-- (src/ai/usage-cap.service.ts; scripts/speaking-generate.ts for TTS).
-- Learners never read or write it: RLS on, no policies.
create table if not exists public.api_usage_daily (
  provider   text   not null check (provider in ('gemini', 'google_tts')),
  day        date   not null,
  units      bigint not null default 0 check (units >= 0),
  updated_at timestamptz not null default now(),
  primary key (provider, day)
);

comment on table public.api_usage_daily is
  'Phase 13 S13: paid API usage per provider per UTC day (gemini = calls, google_tts = characters), checked against the daily caps before each call. service_role only.';

alter table public.api_usage_daily enable row level security;
revoke all on public.api_usage_daily from anon, authenticated;
grant select, insert, update on public.api_usage_daily to service_role;
