-- Option 2 (2026-10-04): how long audio takes to start on learners'
-- phones, so "audio is slow" complaints can be checked with data
-- (docs/phase13-notes.md §15). One row per play: tap → sound in ms, whether
-- the file came from the phone's cache, played or failed, and where the
-- learner is. Country / city come from Cloudflare's CF-IPCountry /
-- CF-IPCity headers; no IP address or file URL is stored, only the host.
--
-- RLS: a learner can insert their own rows only. Nobody signed in can read
-- them back (the numbers are for Dylan, read as service_role / postgres).

create table public.media_load_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid()
                   references public.profiles(id) on delete cascade,
  kind           text not null check (kind in ('word', 'speaking')),
  host           text not null check (length(host) between 1 and 100),
  outcome        text not null check (outcome in ('played', 'error')),
  ms             integer not null check (ms between 0 and 120000),
  from_cache     boolean not null default false,
  effective_type text check (effective_type is null or length(effective_type) <= 10),
  country        text check (country is null or length(country) <= 8),
  city           text check (city is null or length(city) <= 80),
  created_at     timestamptz not null default now()
);

comment on table public.media_load_events is
  'Option 2 (2026-10-04): audio start time per play (tap → sound, ms), from the '
  'phone cache or not, played/error, network type, Cloudflare country/city. '
  'No IP, no file URL. Insert-own only; read by service_role.';

create index idx_media_load_events_created_at on public.media_load_events (created_at desc);

alter table public.media_load_events enable row level security;

create policy media_load_events_insert_own on public.media_load_events
  for insert to authenticated with check (user_id = auth.uid());

revoke all on public.media_load_events from anon, authenticated;
grant insert on public.media_load_events to authenticated;
grant select, insert, update, delete on public.media_load_events to service_role;
