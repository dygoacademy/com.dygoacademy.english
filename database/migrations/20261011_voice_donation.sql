-- Voice donation (`Voice donation consent plan.md` §4, design CHANGELOG
-- 2026-10-11 "Legal: optional voice donation"). A learner can turn on
-- "Help improve Dygo's speech checker" (Profile › Privacy & data, or the box
-- on Create account); from then on the backend keeps a copy of each speaking
-- and pronunciation recording, encrypted, in a private bucket, under a random
-- donor code. Off by default; the API only offers it with
-- VOICE_DONATION_ENABLED=true.
--
--   voice_donation_consents   proof of consent: one row per "on", with the
--                             text version, how (setting / register /
--                             invite) and the app language; withdrawn_at
--                             when turned off. Never deleted, not even with
--                             the account (no foreign key on purpose).
--   voice_donors              the only link between an account and its
--                             donor code (plus the optional "where did you
--                             grow up?" answer). Deleting the row ("Delete my
--                             donated recordings", or the account through
--                             the cascade) queues the code for deletion.
--   voice_donations           one row per kept recording: donor code and
--                             object key, no account id. Read for the
--                             "{n} recordings donated" count.
--   voice_donation_deletions  donor codes whose recordings must go (within
--                             30 days). The backend's daily job deletes the
--                             files and rows, and anything older than 3 years.
--
-- Self-contained (needs only the baseline schema), so the RLS suite can
-- apply it on top of the core fixtures.

create table public.voice_donation_consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  granted_at   timestamptz not null default now(),
  withdrawn_at timestamptz,
  text_version text not null,
  method       text not null
    constraint voice_donation_consents_method_check check (method in ('setting', 'register', 'invite')),
  locale       text,
  constraint voice_donation_consents_withdrawn_after check (withdrawn_at is null or withdrawn_at >= granted_at)
);

-- At most one active consent per learner.
create unique index voice_donation_consents_one_active
  on public.voice_donation_consents (user_id) where withdrawn_at is null;

comment on table public.voice_donation_consents is
  'Voice donation consent records (plan §4): granted_at, withdrawn_at, text_version, method, locale. '
  'Never deleted, even after the recordings or the account go (no FK on purpose).';

create table public.voice_donors (
  user_id    uuid primary key default auth.uid()
               references public.profiles(id) on delete cascade,
  donor_code uuid not null unique default gen_random_uuid(),
  region     text
    constraint voice_donors_region_check check (region in ('north', 'central', 'south', 'elsewhere')),
  created_at timestamptz not null default now()
);

comment on table public.voice_donors is
  'Voice donation: the account ↔ random donor code link, kept only so the learner can delete '
  'their recordings. region = optional "where did you grow up?" (null = prefer not to say).';

create table public.voice_donations (
  id          uuid primary key default gen_random_uuid(),
  donor_code  uuid not null,
  object_key  text not null unique,
  kind        text not null
    constraint voice_donations_kind_check check (kind in ('sentence', 'word')),
  created_at  timestamptz not null default now()
);

create index voice_donations_donor on public.voice_donations (donor_code);
create index voice_donations_created on public.voice_donations (created_at);

comment on table public.voice_donations is
  'Voice donation: one kept recording (encrypted, private bucket VOICE_DONATION_BUCKET). '
  'No account id; the donor code links back only through voice_donors.';

create table public.voice_donation_deletions (
  donor_code   uuid primary key,
  requested_at timestamptz not null default now(),
  done_at      timestamptz
);

comment on table public.voice_donation_deletions is
  'Voice donation: donor codes whose recordings must be deleted (within 30 days). '
  'Filled by the voice_donors delete trigger; worked off by the backend''s daily job.';

-- Deleting a donor row (the learner, or the account's cascade) queues its
-- recordings for deletion. Security definer: the learner can't write this
-- table themselves.
create or replace function public.voice_donor_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.voice_donation_deletions (donor_code)
  values (old.donor_code)
  on conflict (donor_code) do update set requested_at = now(), done_at = null;
  return old;
end;
$$;

create trigger voice_donors_queue_deletion
  after delete on public.voice_donors
  for each row execute function public.voice_donor_deleted();

alter table public.voice_donation_consents  enable row level security;
alter table public.voice_donors             enable row level security;
alter table public.voice_donations          enable row level security;
alter table public.voice_donation_deletions enable row level security;

create policy voice_donation_consents_select_own on public.voice_donation_consents
  for select to authenticated using (user_id = auth.uid());
create policy voice_donation_consents_insert_own on public.voice_donation_consents
  for insert to authenticated with check (user_id = auth.uid());
create policy voice_donation_consents_update_own on public.voice_donation_consents
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy voice_donors_select_own on public.voice_donors
  for select to authenticated using (user_id = auth.uid());
create policy voice_donors_insert_own on public.voice_donors
  for insert to authenticated with check (user_id = auth.uid());
create policy voice_donors_update_own on public.voice_donors
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy voice_donors_delete_own on public.voice_donors
  for delete to authenticated using (user_id = auth.uid());

-- A learner sees and adds only rows under their own donor code.
create policy voice_donations_select_own on public.voice_donations
  for select to authenticated
  using (donor_code in (select d.donor_code from public.voice_donors d where d.user_id = auth.uid()));
create policy voice_donations_insert_own on public.voice_donations
  for insert to authenticated
  with check (donor_code in (select d.donor_code from public.voice_donors d where d.user_id = auth.uid()));

revoke all on public.voice_donation_consents, public.voice_donors,
  public.voice_donations, public.voice_donation_deletions from anon, authenticated;
grant select, insert on public.voice_donation_consents to authenticated;
-- Turning off only stamps withdrawn_at; the rest of a consent row is fixed.
grant update (withdrawn_at) on public.voice_donation_consents to authenticated;
grant select, insert, delete on public.voice_donors to authenticated;
grant update (region) on public.voice_donors to authenticated;
grant select, insert on public.voice_donations to authenticated;
grant select, insert, update, delete on public.voice_donation_consents, public.voice_donors,
  public.voice_donations, public.voice_donation_deletions to service_role;
