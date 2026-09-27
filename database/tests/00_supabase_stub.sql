-- Local-only stub of the Supabase auth schema, so migrations and RLS policies
-- can be executed and tested outside Supabase. NOT part of the migrations.
create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- The GoTrue columns the seed files write (seeds/01_core_fixtures.sql,
-- seeds/03_qa_tenant.sql), so `apply-migrations.sh --test` can load real
-- fixtures into a scratch database that has no GoTrue.
alter table auth.users
  add column if not exists instance_id                uuid,
  add column if not exists aud                        text,
  add column if not exists role                       text,
  add column if not exists encrypted_password         text,
  add column if not exists email_confirmed_at         timestamptz,
  add column if not exists raw_app_meta_data          jsonb,
  add column if not exists confirmation_token         text,
  add column if not exists recovery_token             text,
  add column if not exists email_change_token_new     text,
  add column if not exists email_change               text,
  add column if not exists email_change_token_current text,
  add column if not exists phone_change               text,
  add column if not exists phone_change_token         text,
  add column if not exists reauthentication_token     text,
  add column if not exists created_at                 timestamptz,
  add column if not exists updated_at                 timestamptz;

-- Supabase sets request.jwt.claims; auth.uid() reads the subject from it.
-- Mirrors Supabase's real auth.uid(): it reads request.jwt.claim.sub
-- (singular) first, falling back to the sub key of the request.jwt.claims JSON.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon')          then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role')  then create role service_role nologin bypassrls; end if;
end $$;
