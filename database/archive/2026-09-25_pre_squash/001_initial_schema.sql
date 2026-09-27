-- =============================================================================
-- Dygo Academy — 001_initial_schema.sql
-- Relational tables, types & constraints.
--
-- Source of truth: dygo_academy_complete_system_architecture_master.md (ERD)
--                  dygo_academy_tech_spec_and_conventions.md (§3.1 naming)
--
-- Conventions applied throughout:
--   * tables   : snake_case, plural
--   * columns  : snake_case
--   * PK       : id UUID PRIMARY KEY DEFAULT gen_random_uuid()
--   * FK       : [singular_table]_id
--   * enums    : snake_case type name, UPPERCASE literals
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------

-- Role hierarchy is ADMIN > WRITE > READ (tech spec §4.1).
create type group_role as enum ('ADMIN', 'WRITE', 'READ');

create type seat_status as enum ('ACTIVE', 'REVOKED');

-- FAILED is not in the ERD, which lists only ENRICHING | READY. Added because
-- the BullMQ enrichment worker needs a terminal state for exhausted retries —
-- without it a permanently failing word is indistinguishable from one still in
-- the queue, and the frontend's status polling would spin forever.
create type word_status as enum ('ENRICHING', 'READY', 'FAILED');

create type cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

create type srs_rating as enum ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- -----------------------------------------------------------------------------
-- tenants — a personal or institutional workspace, and the billing boundary
-- -----------------------------------------------------------------------------
create table public.tenants (
  id                   uuid primary key default gen_random_uuid(),
  name                 text        not null,
  purchased_seats      integer     not null default 0 check (purchased_seats >= 0),
  active_seats_used    integer     not null default 0 check (active_seats_used >= 0),
  price_per_seat_cents integer     not null default 0 check (price_per_seat_cents >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- Seats in use can never exceed seats paid for. Enforced here rather than in
  -- application code so a race in the invite flow cannot oversubscribe a tenant.
  constraint tenants_seats_within_purchased
    check (active_seats_used <= purchased_seats)
);

comment on table public.tenants is
  'Workspace and billing boundary. One per solo learner, tutor, or academy.';

-- -----------------------------------------------------------------------------
-- profiles — application-level user record, 1:1 with auth.users
-- -----------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  tenant_id      uuid        references public.tenants (id) on delete set null,
  email          text        not null,
  display_name   text,
  daily_srs_goal integer     not null default 20 check (daily_srs_goal between 1 and 500),
  -- IANA timezone string (e.g. 'Asia/Singapore'). Stored explicitly because the
  -- notification cron computes local reminder times from it (schedule doc §5).
  timezone       text        not null default 'UTC',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint profiles_email_lowercase check (email = lower(email))
);

comment on column public.profiles.id is
  'Mirrors auth.users(id). Populated by a trigger on user signup.';

-- -----------------------------------------------------------------------------
-- tenant_seats — which users occupy a paid seat in which tenant
-- -----------------------------------------------------------------------------
create table public.tenant_seats (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id)  on delete cascade,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  status      seat_status not null default 'ACTIVE',
  assigned_at timestamptz not null default now(),
  revoked_at  timestamptz,

  -- A user holds at most one seat per tenant.
  constraint tenant_seats_unique_user_per_tenant unique (tenant_id, user_id),
  constraint tenant_seats_revoked_has_timestamp
    check ((status = 'REVOKED') = (revoked_at is not null))
);

-- -----------------------------------------------------------------------------
-- master_lexicon — the global, deduplicated linguistic cache
--
-- This is the table that delivers the >85% cache-hit KPI (BRD §2). Enrichment
-- looks here BEFORE calling Gemini/TTS, so rows are keyed by the normalized
-- word + language and are deliberately NOT tenant-scoped.
-- -----------------------------------------------------------------------------
create table public.master_lexicon (
  id                uuid primary key default gen_random_uuid(),
  normalized_word   text        not null,
  language_code     text        not null default 'en',
  part_of_speech    text,
  ipa_us            text,
  ipa_uk            text,
  cefr_level        cefr_level,
  definition_en     text,
  audio_url         text,
  -- Shapes documented in tech spec §4.2:
  --   synonyms/antonyms  : [{ "word": "transient", "level": "C1" }, ...]
  --   example_sentences  : [{ "sentence": "...", "level": "B2",
  --                           "translation_hint": "..." }, ...]
  synonyms          jsonb       not null default '[]'::jsonb,
  antonyms          jsonb       not null default '[]'::jsonb,
  example_sentences jsonb       not null default '[]'::jsonb,
  enriched_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- The ERD marks normalized_word unique, but uniqueness must include the
  -- language: "pain" is a valid entry in both English and French.
  constraint master_lexicon_unique_word_per_language
    unique (normalized_word, language_code),
  constraint master_lexicon_word_is_normalized
    check (normalized_word = lower(trim(normalized_word))),
  constraint master_lexicon_synonyms_is_array   check (jsonb_typeof(synonyms) = 'array'),
  constraint master_lexicon_antonyms_is_array   check (jsonb_typeof(antonyms) = 'array'),
  constraint master_lexicon_examples_is_array   check (jsonb_typeof(example_sentences) = 'array')
);

comment on table public.master_lexicon is
  'Global deduplicated lexical cache. Checked before invoking Gemini/TTS.';

-- -----------------------------------------------------------------------------
-- groups — a class or collaborative workspace within a tenant
-- -----------------------------------------------------------------------------
create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id)  on delete cascade,
  owner_id   uuid        not null references public.profiles (id) on delete restrict,
  name       text        not null check (length(trim(name)) > 0),
  description text,
  is_public  boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- group_members — RBAC join table (ADMIN / WRITE / READ)
-- -----------------------------------------------------------------------------
create table public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid        not null references public.groups (id)   on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  role       group_role  not null default 'READ',
  joined_at  timestamptz not null default now(),

  constraint group_members_unique_user_per_group unique (group_id, user_id)
);

-- -----------------------------------------------------------------------------
-- group_invites — magic invitation links (FR-1.3)
--
-- NOT in the Phase 0 table list in the schedule doc, which jumps straight from
-- group_members to topics. Included here because FR-1.3 requires "cryptographic
-- join tokens" and Phase 1 Module 1 builds the invite flow — adding it now
-- avoids a migration that would alter RLS policies two weeks from now.
-- -----------------------------------------------------------------------------
create table public.group_invites (
  id          uuid        primary key default gen_random_uuid(),
  group_id    uuid        not null references public.groups (id)   on delete cascade,
  created_by  uuid        not null references public.profiles (id) on delete cascade,
  -- Store only a SHA-256 hash of the token. The raw token is shown to the
  -- inviter once and never persisted, so a database leak cannot be replayed
  -- into free access to private classes.
  token_hash  bytea       not null,
  grant_role  group_role  not null default 'READ',
  max_uses    integer     check (max_uses is null or max_uses > 0),
  use_count   integer     not null default 0 check (use_count >= 0),
  expires_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),

  constraint group_invites_token_hash_unique unique (token_hash),
  constraint group_invites_uses_within_max
    check (max_uses is null or use_count <= max_uses)
);

-- -----------------------------------------------------------------------------
-- topics — a vocabulary set inside a group
-- -----------------------------------------------------------------------------
create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid        not null references public.groups (id) on delete cascade,
  title       text        not null check (length(trim(title)) > 0),
  description text,
  is_public   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- topic_words — a lexicon entry placed into a topic
-- -----------------------------------------------------------------------------
create table public.topic_words (
  id            uuid primary key default gen_random_uuid(),
  topic_id      uuid        not null references public.topics (id) on delete cascade,
  -- Nullable: POST /words returns 201 with status ENRICHING in <50ms (FR-2.1),
  -- before the worker has resolved or created the master_lexicon row. The raw
  -- input word is kept so the worker knows what to enrich.
  lexicon_id    uuid        references public.master_lexicon (id) on delete restrict,
  source_word   text        not null check (length(trim(source_word)) > 0),
  language_code text        not null default 'en',
  status        word_status not null default 'ENRICHING',
  custom_note   text,
  added_by      uuid        references public.profiles (id) on delete set null,
  failure_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Same word twice in one topic is a no-op for the learner and would double
  -- its SRS weight.
  constraint topic_words_unique_word_per_topic
    unique (topic_id, source_word, language_code),
  -- A READY row must have resolved to a lexicon entry.
  constraint topic_words_ready_requires_lexicon
    check (status <> 'READY' or lexicon_id is not null)
);

-- -----------------------------------------------------------------------------
-- user_word_srs — per-user scheduling state. Strictly isolated (FR-1.2).
-- -----------------------------------------------------------------------------
create table public.user_word_srs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles (id)    on delete cascade,
  topic_word_id  uuid        not null references public.topic_words (id) on delete cascade,
  -- SM-2 derived. 1.3 is the conventional floor; below it intervals collapse.
  ease_factor    real        not null default 2.5 check (ease_factor >= 1.3),
  interval_days  integer     not null default 0   check (interval_days >= 0),
  repetitions    integer     not null default 0   check (repetitions >= 0),
  total_mistakes integer     not null default 0   check (total_mistakes >= 0),
  -- Rolling 7-day mistake count, the M_recent term in the FR-3.1 formula.
  recent_mistakes integer    not null default 0   check (recent_mistakes >= 0),
  is_leech       boolean     not null default false,
  last_reviewed_at timestamptz,
  next_due_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint user_word_srs_unique_user_per_word unique (user_id, topic_word_id)
);

comment on table public.user_word_srs is
  'Per-user SRS state. RLS restricts every row to its owning user, so two '
  'students in the same class never see or affect each other''s progress.';

-- -----------------------------------------------------------------------------
-- review_logs — append-only review history, partitioned monthly
--
-- Partitioned by reviewed_at per the architecture doc. A partitioned table
-- requires the partition key in every unique constraint, hence the composite
-- primary key (id, reviewed_at) rather than a bare id.
-- -----------------------------------------------------------------------------
create table public.review_logs (
  id                  uuid        not null default gen_random_uuid(),
  user_id             uuid        not null references public.profiles (id)    on delete cascade,
  topic_word_id       uuid        not null references public.topic_words (id) on delete cascade,
  rating              srs_rating  not null,
  was_correct         boolean     not null,
  response_ms         integer     check (response_ms is null or response_ms >= 0),
  ease_factor_after   real,
  interval_days_after integer,
  reviewed_at         timestamptz not null default now(),

  primary key (id, reviewed_at)
) partition by range (reviewed_at);

-- Initial partitions. Provisioning beyond the current month is deliberate:
-- an insert with no matching partition fails outright, which would take down
-- reviews at midnight on the 1st. A scheduled job should keep this ahead.
create table public.review_logs_2026_08 partition of public.review_logs
  for values from ('2026-08-01') to ('2026-09-01');
create table public.review_logs_2026_09 partition of public.review_logs
  for values from ('2026-09-01') to ('2026-10-01');
create table public.review_logs_2026_10 partition of public.review_logs
  for values from ('2026-10-01') to ('2026-11-01');
create table public.review_logs_2026_11 partition of public.review_logs
  for values from ('2026-11-01') to ('2026-12-01');
create table public.review_logs_2026_12 partition of public.review_logs
  for values from ('2026-12-01') to ('2027-01-01');
create table public.review_logs_2027_01 partition of public.review_logs
  for values from ('2027-01-01') to ('2027-02-01');

-- Catch-all so a review can never fail on a missing partition. Rows landing
-- here indicate the partition-provisioning job has fallen behind.
create table public.review_logs_default partition of public.review_logs default;

-- -----------------------------------------------------------------------------
-- study_schedules — daily habit reminder configuration (FR-6.1)
-- -----------------------------------------------------------------------------
create table public.study_schedules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  reminder_time time        not null,
  -- IANA string, e.g. 'Asia/Singapore'. The 15-minute cron matches local time
  -- against this rather than storing a UTC offset, which would break on DST.
  timezone      text        not null default 'UTC',
  is_enabled    boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint study_schedules_unique_time_per_user unique (user_id, reminder_time)
);

-- -----------------------------------------------------------------------------
-- push_subscriptions — VAPID Web Push endpoints (FR-6.5)
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  endpoint   text        not null,
  p256dh_key text        not null,
  auth_key   text        not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,

  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'tenants', 'profiles', 'master_lexicon', 'groups', 'topics',
    'topic_words', 'user_word_srs', 'study_schedules'
  ] loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Provision a profile whenever a Supabase auth user is created.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Attached to auth.users. In Supabase this requires elevated privileges; if the
-- migration runs as a role that cannot touch the auth schema, create this
-- trigger from the SQL editor instead.
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- Seat the owner as ADMIN the moment a group is created.
--
-- Without this, self-service group creation deadlocks under RLS: groups_insert
-- (002_rls_policies.sql) only requires owner_id = auth.uid(), but
-- group_members_insert_admin requires has_group_role(group_id, 'ADMIN') —
-- which is false for every group until a group_members row exists. A brand
-- new authenticated user could create a group and then be permanently unable
-- to add themselves to its roster, add topics that need a WRITE/ADMIN group
-- member, or ever manage it. 004_seed_data.sql never exercises this path
-- because fixtures are inserted as service_role, which bypasses RLS entirely.
-- security definer lets this trigger write group_members on the owner's
-- behalf without needing its own INSERT policy.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'ADMIN')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;

create trigger trg_group_owner_membership
  after insert on public.groups
  for each row execute function public.handle_new_group();
